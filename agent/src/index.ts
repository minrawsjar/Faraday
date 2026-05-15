import "dotenv/config";
import { createPublicClient, http, parseAbi } from "viem";
import { config } from "./config.js";
import { fetchAaveHealth } from "./monitor/healthFactor.js";
import { decide } from "./brain/decide.js";
import { executeProtection } from "./executor/protect.js";
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

        if (hf > trigger * 1.2) continue; // well above threshold, skip Claude call

        const decision = await decide(position);
        console.log(
          `[Faraday] Position ${position.positionId} | HF: ${hf.toFixed(3)} | ` +
          `Urgency: ${decision.urgency} | Intervene: ${decision.shouldIntervene} | ` +
          `Reason: ${decision.reasoning}`
        );

        if (decision.shouldIntervene && decision.usdcAmount > 0n) {
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
