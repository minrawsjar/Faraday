import { createPublicClient, createWalletClient, http, parseAbi, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { AppKit } from "@circle-fin/app-kit";
import type { UnifiedBalanceChainIdentifier } from "@circle-fin/app-kit";
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";
import { config } from "../config.js";
import type { PositionHealth } from "../monitor/healthFactor.js";

// AppKit chain identifiers for supported testnets
const CHAIN_ID_TO_APPKIT: Record<number, UnifiedBalanceChainIdentifier> = {
  84532:    "Base_Sepolia"         as UnifiedBalanceChainIdentifier,
  421614:   "Arbitrum_Sepolia"     as UnifiedBalanceChainIdentifier,
  11155111: "Ethereum_Sepolia"     as UnifiedBalanceChainIdentifier,
  11155420: "Optimism_Sepolia"     as UnifiedBalanceChainIdentifier,
  80002:    "Polygon_Amoy_Testnet" as UnifiedBalanceChainIdentifier,
  5042002:  "Arc_Testnet"          as UnifiedBalanceChainIdentifier,
};

const VAULT_ABI = parseAbi([
  "function executeProtection(address user, uint256 usdcAmount, uint32 destinationChainId, address recipient) external",
  "function totalReserve(address user) external view returns (uint256)",
]);

const REGISTRY_ABI = parseAbi([
  "function logIntervention(uint256 id, uint256 usdcAmount) external",
]);

export async function executeProtection(
  position: PositionHealth,
  usdcAmount: bigint
): Promise<`0x${string}`> {
  const destChainName = CHAIN_ID_TO_APPKIT[position.chainId];
  if (!destChainName) {
    throw new Error(`Chain ${position.chainId} not supported by Circle AppKit`);
  }

  const arcChain = {
    id: config.chains.arc.id,
    name: "ARC",
    nativeCurrency: { name: "ARC", symbol: "ARC", decimals: 18 },
    rpcUrls: { default: { http: [config.chains.arc.rpc] } },
  } as const;

  const publicClient = createPublicClient({
    chain: arcChain,
    transport: http(config.chains.arc.rpc),
  });

  // Check how much USDC is available in the vault for this user
  const available = await publicClient.readContract({
    address: config.contracts.vault,
    abi: VAULT_ABI,
    functionName: "totalReserve",
    args: [position.userAddress],
  });

  const agentKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
  const account  = privateKeyToAccount(agentKey);

  const walletClient = createWalletClient({
    account,
    chain: arcChain,
    transport: http(config.chains.arc.rpc),
  });

  // Step 2: use Circle AppKit Unified Balance SDK to spend cross-chain
  const kit     = new AppKit();
  const adapter = createViemAdapterFromPrivateKey({ privateKey: agentKey });

  // Check if gateway already has funds from a prior failed spend — recover them first
  const existingBalances = await kit.unifiedBalance.getBalances({ token: "USDC", sources: { adapter } });
  const existingGateway  = parseFloat(existingBalances.totalConfirmedBalance);
  console.log(`[Faraday] Existing gateway balance: ${existingGateway} USDC`);

  const humanRequested = formatUnits(usdcAmount, 6);
  let spendAmount: string;

  if (existingGateway > 0) {
    // Gateway already has funds from a prior run — spend them directly, no vault call
    spendAmount = existingBalances.totalConfirmedBalance;
    console.log(`[Faraday] Recovering ${spendAmount} USDC from gateway — skipping vault`);
  } else {
    // Normal path: pull from vault
    if (available === 0n) {
      throw new Error(`Vault has 0 USDC for ${position.userAddress} — skipping intervention`);
    }

    const capped = usdcAmount > available ? available : usdcAmount;
    const humanAmount = formatUnits(capped, 6);
    console.log(
      `[Faraday] Vault balance: ${formatUnits(available, 6)} USDC | ` +
      `Requested: ${humanRequested} USDC | Sending: ${humanAmount} USDC`
    );

    // Step 1: vault deducts from user reserve → sends USDC to agent's EOA on Arc
    const vaultTx = await walletClient.writeContract({
      address: config.contracts.vault,
      abi: VAULT_ABI,
      functionName: "executeProtection",
      args: [position.userAddress, capped, position.chainId, position.userAddress],
    });
    await publicClient.waitForTransactionReceipt({ hash: vaultTx });
    console.log(`[Faraday] Vault sent ${humanAmount} USDC to agent | tx: ${vaultTx}`);

    // Deposit USDC from agent's Arc wallet into the Gateway account
    const depositResult = await kit.unifiedBalance.deposit({
      from:   { adapter, chain: "Arc_Testnet" },
      amount: humanAmount,
      token:  "USDC",
    });
    console.log(`[Faraday] Deposited ${humanAmount} USDC into Gateway | tx: ${depositResult.txHash}`);

    // Re-query confirmed balance (fees may have slightly reduced it)
    const afterDeposit = await kit.unifiedBalance.getBalances({ token: "USDC", sources: { adapter } });
    spendAmount = afterDeposit.totalConfirmedBalance;
    console.log(`[Faraday] Gateway confirmed balance after deposit: ${spendAmount} USDC`);

    if (parseFloat(spendAmount) <= 0) {
      throw new Error(`Gateway balance is 0 after deposit — cannot spend`);
    }
  }

  // 2d. Spend from Gateway account → mint on destination chain for the user
  const spendResult = await kit.unifiedBalance.spend({
    amount: spendAmount,
    token:  "USDC",
    from:   [{ adapter }],
    to:     { adapter, chain: destChainName, recipientAddress: position.userAddress },
  });
  console.log(
    `[Faraday] Cross-chain spend complete | ` +
    `${spendAmount} USDC → ${destChainName} for ${position.userAddress} | ` +
    `tx: ${spendResult.txHash} | explorer: ${spendResult.explorerUrl}`
  );

  // Step 3: log the intervention on-chain (use spendAmount converted back to base units)
  const spendAmountUnits = BigInt(Math.round(parseFloat(spendAmount) * 1e6));
  await walletClient.writeContract({
    address: config.contracts.registry,
    abi: REGISTRY_ABI,
    functionName: "logIntervention",
    args: [position.positionId, spendAmountUnits],
  });

  console.log(
    `[Faraday] Protected position ${position.positionId} | ` +
    `${spendAmount} USDC → ${destChainName} | spend: ${spendResult.txHash}`
  );

  return spendResult.txHash as `0x${string}`;
}
