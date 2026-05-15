"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { parseAbi } from "viem";

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}`;

const REGISTRY_ABI = parseAbi([
  "function totalPositions() external view returns (uint256)",
  "function getPosition(uint256 id) external view returns (address user, uint8 protocol, uint32 chainId, uint256 triggerHF, uint256 targetHF, bool active)",
  "function getUserPositions(address user) external view returns (uint256[])",
]);

export const PROTOCOL_NAMES = ["AAVE", "VENUS", "GMX"] as const;

export interface Position {
  id: bigint;
  user: `0x${string}`;
  protocol: string;
  chainId: number;
  triggerHF: number;
  targetHF: number;
  active: boolean;
}

export function useUserPositions(userAddress: `0x${string}` | undefined) {
  const { data: ids } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "getUserPositions",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const contracts = (ids ?? []).map((id) => ({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "getPosition" as const,
    args: [id] as const,
  }));

  const { data: positionData, refetch } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0, refetchInterval: 30_000 },
  });

  const positions: Position[] = (positionData ?? [])
    .map((result, i) => {
      if (result.status !== "success") return null;
      const [user, protocol, chainId, triggerHF, targetHF, active] = result.result as [
        `0x${string}`, number, number, bigint, bigint, boolean
      ];
      return {
        id: ids![i],
        user,
        protocol: PROTOCOL_NAMES[protocol] ?? "UNKNOWN",
        chainId,
        triggerHF: Number(triggerHF) / 1e18,
        targetHF: Number(targetHF) / 1e18,
        active,
      };
    })
    .filter(Boolean) as Position[];

  return { positions, refetch };
}
