"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http, parseAbi, formatUnits } from "viem";

const AAVE_POOL_ABI = parseAbi([
  "function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
]);

const SCAN_TARGETS = [
  {
    label: "Aave v3 ·Base Sepolia",
    protocol: 0 as const,
    chainId: 84532,
    poolAddress: "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27" as `0x${string}`,
    rpc: "https://sepolia.base.org",
  },
  {
    label: "Aave v3 ·Ethereum Sepolia",
    protocol: 0 as const,
    chainId: 11155111,
    poolAddress: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951" as `0x${string}`,
    rpc: "https://ethereum-sepolia-rpc.publicnode.com",
  },
  {
    label: "Aave v3 ·Arbitrum Sepolia",
    protocol: 0 as const,
    chainId: 421614,
    poolAddress: "0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff" as `0x${string}`,
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
  },
];

export interface DetectedPosition {
  label: string;
  protocol: number;
  chainId: number;
  collateralUsd: number;
  debtUsd: number;
  healthFactor: number;
}

export function useDetectPositions(address: string | undefined) {
  const [positions, setPositions] = useState<DetectedPosition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;

    setLoading(true);
    setPositions([]);

    const scan = async () => {
      const results = await Promise.allSettled(
        SCAN_TARGETS.map(async (target): Promise<DetectedPosition | null> => {
          const client = createPublicClient({ transport: http(target.rpc) });
          const [collateral, debt, , , , hf] = await client.readContract({
            address: target.poolAddress,
            abi: AAVE_POOL_ABI,
            functionName: "getUserAccountData",
            args: [address as `0x${string}`],
          });
          if (collateral === 0n) return null;
          return {
            label: target.label,
            protocol: target.protocol,
            chainId: target.chainId,
            collateralUsd: parseFloat(formatUnits(collateral, 8)),
            debtUsd: parseFloat(formatUnits(debt, 8)),
            healthFactor: debt === 0n ? 999 : parseFloat(formatUnits(hf, 18)),
          };
        })
      );

      const found = results
        .filter((r): r is PromiseFulfilledResult<DetectedPosition | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((v): v is DetectedPosition => v !== null);

      setPositions(found);
      setLoading(false);
    };

    scan();
  }, [address]);

  return { positions, loading };
}
