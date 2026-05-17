import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { config } from "../config.js";

// Aave V3 Pool — getReservesList + getReserveData (gives variableDebtToken address)
const POOL_ABI = parseAbi([
  "function getReservesList() external view returns (address[])",
  "function getReserveData(address asset) external view returns (uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt)",
]);

const ERC20_ABI = parseAbi([
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function balanceOf(address) external view returns (uint256)",
]);

const AAVE_POOL: Record<number, `0x${string}`> = {
  11155111: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  421614:   "0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff",
  84532:    "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27",
};

export interface DebtToken {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  totalDebt: bigint;
  totalDebtUsd: number;
  agentBalance: bigint;
  agentBalanceUsd: number;
  repayNeeded: bigint;     // token units needed to reach target HF
  canDirectRepay: boolean; // agent has enough
}

export async function getAaveDebtTokens(
  userAddress: `0x${string}`,
  agentAddress: `0x${string}`,
  chainId: number,
  repayAmountUsd: number
): Promise<DebtToken[]> {
  const chainCfg = Object.values(config.chains).find((c) => c.id === chainId);
  if (!chainCfg) return [];

  const poolAddress = AAVE_POOL[chainId];
  if (!poolAddress) return [];

  const client = createPublicClient({ transport: http(chainCfg.rpc) });

  let reserves: readonly `0x${string}`[] = [];
  try {
    reserves = await client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: "getReservesList" });
  } catch { return []; }

  const results: DebtToken[] = [];

  for (const asset of reserves) {
    try {
      const reserveData = await client.readContract({
        address: poolAddress, abi: POOL_ABI, functionName: "getReserveData", args: [asset],
      });
      const variableDebtTokenAddress = reserveData[10] as `0x${string}`;

      // User's variable debt balance
      const variableDebt = await client.readContract({
        address: variableDebtTokenAddress, abi: ERC20_ABI, functionName: "balanceOf", args: [userAddress],
      });
      if (variableDebt === 0n) continue;

      const [symbol, decimals] = await Promise.all([
        client.readContract({ address: asset, abi: ERC20_ABI, functionName: "symbol" }),
        client.readContract({ address: asset, abi: ERC20_ABI, functionName: "decimals" }),
      ]);

      const dec = Number(decimals);
      const totalDebtUsd = Number(formatUnits(variableDebt, dec));
      const agentBalance = await client.readContract({
        address: asset, abi: ERC20_ABI, functionName: "balanceOf", args: [agentAddress],
      });
      const agentBalanceUsd = Number(formatUnits(agentBalance, dec));

      // How many tokens to repay proportional to USD needed
      const repayFraction = Math.min(1, repayAmountUsd / totalDebtUsd);
      const repayNeeded = BigInt(Math.ceil(Number(variableDebt) * repayFraction));

      results.push({
        address: asset,
        symbol: String(symbol),
        decimals: dec,
        totalDebt: variableDebt,
        totalDebtUsd,
        agentBalance,
        agentBalanceUsd,
        repayNeeded,
        canDirectRepay: agentBalance >= repayNeeded,
      });
    } catch { /* skip token */ }
  }

  return results;
}
