import { createPublicClient, http, parseAbi } from "viem";
import { config } from "../config.js";

const AAVE_POOL_ABI = parseAbi([
  "function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
]);

// Aave v3 Pool addresses per chain
const AAVE_POOL: Record<number, `0x${string}`> = {
  1:     "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", // Ethereum
  42161: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Arbitrum
};

export interface PositionHealth {
  positionId: bigint;
  userAddress: `0x${string}`;
  chainId: number;
  protocol: string;
  healthFactor: bigint;        // 18 decimals
  totalCollateralBase: bigint; // 8 decimals USD
  totalDebtBase: bigint;       // 8 decimals USD
  liquidationThreshold: bigint;
  triggerHF: bigint;
  targetHF: bigint;
}

export async function fetchAaveHealth(
  userAddress: `0x${string}`,
  chainId: number
): Promise<Omit<PositionHealth, "positionId" | "triggerHF" | "targetHF" | "protocol">> {
  const chainConfig = Object.values(config.chains).find((c) => c.id === chainId);
  if (!chainConfig) throw new Error(`No RPC config for chain ${chainId}`);

  const poolAddress = AAVE_POOL[chainId];
  if (!poolAddress) throw new Error(`No Aave pool for chain ${chainId}`);

  const client = createPublicClient({ transport: http(chainConfig.rpc) });

  const [
    totalCollateralBase,
    totalDebtBase,
    ,
    currentLiquidationThreshold,
    ,
    healthFactor,
  ] = await client.readContract({
    address: poolAddress,
    abi: AAVE_POOL_ABI,
    functionName: "getUserAccountData",
    args: [userAddress],
  });

  return {
    userAddress,
    chainId,
    healthFactor,
    totalCollateralBase,
    totalDebtBase,
    liquidationThreshold: currentLiquidationThreshold,
  };
}
