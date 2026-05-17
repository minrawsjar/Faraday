import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";
import type { DebtToken } from "../monitor/aaveDebt.js";

const AAVE_POOL_ABI = parseAbi([
  "function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256)",
]);

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
]);

const AAVE_POOL: Record<number, `0x${string}`> = {
  11155111: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  421614:   "0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff",
  84532:    "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27",
};

export async function repayOnChain(
  userAddress: `0x${string}`,
  chainId: number,
  debtToken: DebtToken
): Promise<`0x${string}`> {
  const chainCfg = Object.values(config.chains).find((c) => c.id === chainId);
  if (!chainCfg) throw new Error(`No RPC for chain ${chainId}`);

  const poolAddress = AAVE_POOL[chainId];
  if (!poolAddress) throw new Error(`No Aave pool for chain ${chainId}`);

  const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);

  const chain = {
    id: chainId,
    name: `Chain-${chainId}`,
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [chainCfg.rpc] } },
  } as const;

  const publicClient = createPublicClient({ chain, transport: http(chainCfg.rpc) });
  const walletClient = createWalletClient({ account, chain, transport: http(chainCfg.rpc) });

  const amount = debtToken.repayNeeded;

  console.log(
    `[Faraday] Direct repay: ${Number(amount) / 10 ** debtToken.decimals} ${debtToken.symbol}` +
    ` on chain ${chainId} for ${userAddress}`
  );

  // 1. Approve Aave pool to spend the debt token
  const approveTx = await walletClient.writeContract({
    address: debtToken.address,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [poolAddress, amount],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log(`[Faraday] Approved Aave pool for ${debtToken.symbol} | tx: ${approveTx}`);

  // 2. Repay on behalf of the user (interestRateMode 2 = variable)
  const repayTx = await walletClient.writeContract({
    address: poolAddress,
    abi: AAVE_POOL_ABI,
    functionName: "repay",
    args: [debtToken.address, amount, 2n, userAddress],
  });

  console.log(
    `[Faraday] Repaid ${Number(amount) / 10 ** debtToken.decimals} ${debtToken.symbol}` +
    ` on Aave (chain ${chainId}) | tx: ${repayTx}`
  );

  return repayTx;
}
