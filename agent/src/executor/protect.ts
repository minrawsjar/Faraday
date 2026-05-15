import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";
import type { PositionHealth } from "../monitor/healthFactor.js";

const VAULT_ABI = parseAbi([
  "function executeProtection(address user, uint256 usdcAmount, uint32 destinationChainId, address recipient) external",
]);

const REGISTRY_ABI = parseAbi([
  "function logIntervention(uint256 id, uint256 usdcAmount) external",
]);

export async function executeProtection(
  position: PositionHealth,
  usdcAmount: bigint
): Promise<`0x${string}`> {
  const arcChain = {
    id: config.chains.arc.id,
    name: "ARC",
    nativeCurrency: { name: "ARC", symbol: "ARC", decimals: 18 },
    rpcUrls: { default: { http: [config.chains.arc.rpc] } },
  } as const;

  // Circle Wallet private key — in production this is managed by Circle's KMS
  const agentKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(agentKey);

  const walletClient = createWalletClient({
    account,
    chain: arcChain,
    transport: http(config.chains.arc.rpc),
  });

  const txHash = await walletClient.writeContract({
    address: config.contracts.vault,
    abi: VAULT_ABI,
    functionName: "executeProtection",
    args: [
      position.userAddress,
      usdcAmount,
      position.chainId,
      position.userAddress, // recipient = the user's address on destination chain
    ],
  });

  // Log the intervention on-chain for auditability
  await walletClient.writeContract({
    address: config.contracts.registry,
    abi: REGISTRY_ABI,
    functionName: "logIntervention",
    args: [position.positionId, usdcAmount],
  });

  console.log(
    `[Faraday] Protected position ${position.positionId} | ` +
    `${Number(usdcAmount) / 1e6} USDC → chain ${position.chainId} | tx: ${txHash}`
  );

  return txHash;
}
