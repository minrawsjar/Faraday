import "dotenv/config";
import { createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config.js";
import { fetchAaveHealth } from "./monitor/healthFactor.js";
import { getAaveDebtTokens } from "./monitor/aaveDebt.js";
import { decide } from "./brain/decide.js";
import { executeProtection } from "./executor/protect.js";
import { repayOnChain } from "./executor/repayOnChain.js";
import type { PositionHealth } from "./monitor/healthFactor.js";

const REGISTRY_ABI = parseAbi([
  "function totalPositions() external view returns (uint256)",
  "function getPosition(uint256 id) external view returns (address user, uint8 protocol, uint32 chainId, uint256 triggerHF, uint256 targetHF, bool active)",
]);

async function fetchActivePositions(): Promise<PositionHealth[]> {
  const arcChain = {
    id: config.chains.arc.id,
    name: "ARC",
    nativeCurrency: { name: "ARC", symbol: "ARC", decimals: 18 },
    rpcUrls: { default: { http: [config.chains.arc.rpc] } },
  } as const;

  const client = createPublicClient({
    chain: arcChain,
    transport: http(config.chains.arc.rpc),
  });

  const total = await client.readContract({
    address: config.contracts.registry,
    abi: REGISTRY_ABI,
    functionName: "totalPositions",
  });

  const positions: PositionHealth[] = [];

  for (let i = 0n; i < total; i++) {
    const [user, protocol, chainId, triggerHF, targetHF, active] =
      await client.readContract({
        address: config.contracts.registry,
        abi: REGISTRY_ABI,
        functionName: "getPosition",
        args: [i],
      });

    if (!active) continue;

    const protocolName = ["AAVE", "VENUS", "GMX"][protocol] ?? "UNKNOWN";

    try {
      const health = await fetchAaveHealth(user as `0x${string}`, chainId);
      positions.push({
        positionId: i,
        protocol: protocolName,
        triggerHF,
        targetHF,
        ...health,
      });
    } catch (err) {
      console.warn(`[Faraday] Could not fetch health for position ${i}:`, err);
    }
  }

  return positions;
}

async function runLoop() {
  console.log("[Faraday] Agent started. Polling every", config.agent.pollIntervalMs / 1000, "seconds.");

  while (true) {
    const start = Date.now();

    try {
      const positions = await fetchActivePositions();
      console.log(`[Faraday] Monitoring ${positions.length} active positions`);

      for (const position of positions) {
        const hf = Number(position.healthFactor) / 1e18;
        const trigger = Number(position.triggerHF) / 1e18;

        if (hf > trigger * 1.2) continue; // well above threshold, skip AI call

        const agentAddress = privateKeyToAccount(
          process.env.AGENT_PRIVATE_KEY as `0x${string}`
        ).address;

        const repayUsd = Math.max(0,
          (Number(position.totalDebtBase) / 1e8) *
          (Number(position.targetHF) / 1e18) /
          (Number(position.liquidationThreshold) / 10000) -
          Number(position.totalCollateralBase) / 1e8
        );

        // Discover what the user owes and whether agent can cover it directly
        const debtTokens = await getAaveDebtTokens(
          position.userAddress,
          agentAddress,
          position.chainId,
          repayUsd
        );

        const decision = await decide(position, debtTokens);
        console.log(
          `[Faraday] Position ${position.positionId} | HF: ${hf.toFixed(3)} | ` +
          `Urgency: ${decision.urgency} | Intervene: ${decision.shouldIntervene} | ` +
          `Strategy: ${decision.strategy} | Reason: ${decision.reasoning}`
        );

        if (!decision.shouldIntervene || decision.usdcAmount === 0n) continue;

        if (decision.strategy === "direct_repay" && decision.debtToken) {
          // Agent has the token on the destination chain — repay Aave directly
          await repayOnChain(position.userAddress, position.chainId, decision.debtToken);
        } else {
          // Fall back to vault funds bridged via ARC Gateway
          await executeProtection(position, decision.usdcAmount);
        }
      }
    } catch (err) {
      console.error("[Faraday] Loop error:", err);
    }

    const elapsed = Date.now() - start;
    const wait = Math.max(0, config.agent.pollIntervalMs - elapsed);
    await new Promise((r) => setTimeout(r, wait));
  }
}

runLoop().catch((err) => {
  console.error("[Faraday] Fatal error:", err);
  process.exit(1);
});
