"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { parseAbi, formatUnits, parseAbiItem, type Log } from "viem";
import { useUserPositions } from "@/hooks/usePositions";

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}`;
const VAULT_ADDRESS    = process.env.NEXT_PUBLIC_VAULT_ADDRESS    as `0x${string}`;

const VAULT_ABI = parseAbi([
  "function reserves(address user) external view returns (uint256 liquidUsdc, uint256 usycShares)",
  "function totalReserve(address user) external view returns (uint256)",
]);

interface Entry {
  kind: "register" | "intervention" | "deposit" | "withdraw" | "protect" | "snapshot";
  text: string;
  sub?: string;
  tx?: `0x${string}`;
  block?: bigint;
  color: string;
}

const glass = {
  background: "linear-gradient(127deg, rgba(6,11,40,0.94) 0%, rgba(10,14,35,0.6) 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(40px)",
};

const CHAIN_NAMES: Record<number, string> = {
  11155111: "Sepolia", 421614: "Arb Sepolia", 97: "BNB Testnet", 84532: "Base Sepolia",
};

const SCAN_BLOCKS = 2000n;

export function AgentLogs() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { positions } = useUserPositions(address);
  const [recentEvents, setRecentEvents] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read current vault state for the "snapshot" row
  const [vaultSnapshot, setVaultSnapshot] = useState<{ liquid: bigint; usyc: bigint } | null>(null);

  useEffect(() => {
    if (!address || !publicClient) return;
    let mounted = true;

    const load = async () => {
      setError(null);
      try {
        const latest = await publicClient.getBlockNumber();
        const fromBlock = latest > SCAN_BLOCKS ? latest - SCAN_BLOCKS : 0n;

        // Also read vault state directly for the always-visible "current" snapshot
        publicClient.readContract({
          address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "reserves",
          args: [address],
        }).then((res) => {
          const [liquid, usyc] = res as [bigint, bigint];
          if (mounted) setVaultSnapshot({ liquid, usyc });
        }).catch(() => { /* ignore */ });

        const userPositionIds = new Set(positions.map((p) => p.id));

        // Use allSettled so any one failure doesn't kill everything
        const queries = await Promise.allSettled([
          publicClient.getLogs({
            address: REGISTRY_ADDRESS,
            event: parseAbiItem("event PositionRegistered(uint256 indexed id, address indexed user, uint8 protocol, uint32 chainId)"),
            args: { user: address },
            fromBlock, toBlock: latest,
          }),
          publicClient.getLogs({
            address: REGISTRY_ADDRESS,
            event: parseAbiItem("event InterventionLogged(uint256 indexed id, uint256 usdcAmount, uint256 timestamp)"),
            fromBlock, toBlock: latest,
          }),
          publicClient.getLogs({
            address: VAULT_ADDRESS,
            event: parseAbiItem("event Deposited(address indexed user, uint256 usdcAmount, uint256 usycShares)"),
            args: { user: address },
            fromBlock, toBlock: latest,
          }),
          publicClient.getLogs({
            address: VAULT_ADDRESS,
            event: parseAbiItem("event Withdrawn(address indexed user, uint256 usdcAmount)"),
            args: { user: address },
            fromBlock, toBlock: latest,
          }),
          publicClient.getLogs({
            address: VAULT_ADDRESS,
            event: parseAbiItem("event ProtectionExecuted(address indexed user, uint256 usdcAmount, uint32 destinationChain, address recipient)"),
            args: { user: address },
            fromBlock, toBlock: latest,
          }),
        ]);

        const [regResult, interventionResult, depositResult, withdrawResult, protectResult] = queries;
        const all: Entry[] = [];

        if (regResult.status === "fulfilled") {
          for (const log of regResult.value) {
            const { id, protocol, chainId } = (log as Log & { args: { id: bigint; protocol: number; chainId: number } }).args;
            all.push({
              kind: "register", text: `Registered position #${id}`,
              sub: `${["AAVE","VENUS","GMX"][protocol] ?? "?"} on ${CHAIN_NAMES[chainId] ?? `chain ${chainId}`}`,
              tx: log.transactionHash!, block: log.blockNumber!, color: "#06b6d4",
            });
          }
        } else { console.warn("[AgentLogs] register query failed:", regResult.reason); }

        if (interventionResult.status === "fulfilled") {
          for (const log of interventionResult.value) {
            const { id, usdcAmount } = (log as Log & { args: { id: bigint; usdcAmount: bigint; timestamp: bigint } }).args;
            if (!userPositionIds.has(id)) continue;
            all.push({
              kind: "intervention", text: `Intervention on position #${id}`,
              sub: `${parseFloat(formatUnits(usdcAmount, 6)).toFixed(2)} USDC bridged`,
              tx: log.transactionHash!, block: log.blockNumber!, color: "#f97316",
            });
          }
        } else { console.warn("[AgentLogs] intervention query failed:", interventionResult.reason); }

        if (depositResult.status === "fulfilled") {
          for (const log of depositResult.value) {
            const { usdcAmount } = (log as Log & { args: { user: `0x${string}`; usdcAmount: bigint; usycShares: bigint } }).args;
            all.push({
              kind: "deposit", text: "Deposit to vault",
              sub: `${parseFloat(formatUnits(usdcAmount, 6)).toFixed(2)} USDC`,
              tx: log.transactionHash!, block: log.blockNumber!, color: "#3b82f6",
            });
          }
        } else { console.warn("[AgentLogs] deposit query failed:", depositResult.reason); }

        if (withdrawResult.status === "fulfilled") {
          for (const log of withdrawResult.value) {
            const { usdcAmount } = (log as Log & { args: { user: `0x${string}`; usdcAmount: bigint } }).args;
            all.push({
              kind: "withdraw", text: "Vault withdrawal",
              sub: `${parseFloat(formatUnits(usdcAmount, 6)).toFixed(2)} USDC`,
              tx: log.transactionHash!, block: log.blockNumber!, color: "#94a3b8",
            });
          }
        } else { console.warn("[AgentLogs] withdraw query failed:", withdrawResult.reason); }

        if (protectResult.status === "fulfilled") {
          for (const log of protectResult.value) {
            const { usdcAmount, destinationChain } = (log as Log & { args: { user: `0x${string}`; usdcAmount: bigint; destinationChain: number; recipient: `0x${string}` } }).args;
            all.push({
              kind: "protect", text: "Protection executed",
              sub: `${parseFloat(formatUnits(usdcAmount, 6)).toFixed(2)} USDC bridged to ${CHAIN_NAMES[destinationChain] ?? `chain ${destinationChain}`}`,
              tx: log.transactionHash!, block: log.blockNumber!, color: "#10b981",
            });
          }
        } else { console.warn("[AgentLogs] protect query failed:", protectResult.reason); }

        all.sort((a, b) => Number((b.block ?? 0n) - (a.block ?? 0n)));

        const allFailed = queries.every((q) => q.status === "rejected");
        if (mounted) {
          setRecentEvents(all);
          if (allFailed) setError("ARC RPC returned no logs (pruned history). Showing live state below.");
        }
      } catch (err) {
        console.error("[AgentLogs] fatal:", err);
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 20_000);
    return () => { mounted = false; clearInterval(interval); };
  }, [address, publicClient, positions]);

  // Build a synthetic timeline from contract storage (always available)
  const stateTimeline: Entry[] = [];
  if (vaultSnapshot) {
    const liquid = parseFloat(formatUnits(vaultSnapshot.liquid, 6));
    const usyc   = parseFloat(formatUnits(vaultSnapshot.usyc, 6));
    if (liquid > 0 || usyc > 0) {
      stateTimeline.push({
        kind: "snapshot", text: "Current vault state",
        sub: `${liquid.toFixed(2)} USDC liquid · ${usyc.toFixed(4)} USYC shares`,
        color: "#3b82f6",
      });
    }
  }
  for (const p of positions.filter((p) => p.active)) {
    stateTimeline.push({
      kind: "snapshot", text: `Active position #${p.id}`,
      sub: `${p.protocol} on ${CHAIN_NAMES[p.chainId] ?? `chain ${p.chainId}`} · trigger ${p.triggerHF.toFixed(2)} · target ${p.targetHF.toFixed(2)}`,
      color: "#06b6d4",
    });
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={glass}>
      <div className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div>
          <h2 className="font-display text-lg font-bold text-white">Agent Activity</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            Last {SCAN_BLOCKS.toString()} ARC blocks · auto-refresh 20s
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full"
          style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "#67e8f9" }}>
          {recentEvents.length} recent · {stateTimeline.length} active
        </span>
      </div>

      {/* Current state (always available) */}
      {stateTimeline.length > 0 && (
        <>
          <div className="px-6 py-2.5"
            style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.3)" }}>
              Live state · from contract storage
            </span>
          </div>
          {stateTimeline.map((entry, i) => (
            <div key={`state-${i}`} className="px-6 py-4 flex items-start gap-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: entry.color, boxShadow: `0 0 8px ${entry.color}` }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{entry.text}</p>
                {entry.sub && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{entry.sub}</p>}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Recent events from logs */}
      <div className="px-6 py-2.5"
        style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.3)" }}>
          Recent on-chain events
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-xs gap-2" style={{ color: "rgba(255,255,255,0.3)" }}>
          <span className="w-3 h-3 rounded-full border border-cyan-500/40 border-t-cyan-400 animate-spin" />
          Scanning last {SCAN_BLOCKS.toString()} blocks…
        </div>
      ) : error && recentEvents.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{error}</p>
        </div>
      ) : recentEvents.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            No events in the last {SCAN_BLOCKS.toString()} blocks. Older events may be pruned by ARC RPC.
          </p>
        </div>
      ) : (
        <div className="max-h-[500px] overflow-y-auto">
          {recentEvents.map((entry, i) => (
            <div key={`${entry.tx}-${i}`}
              className="px-6 py-4 flex items-start gap-4 hover:bg-white/[0.02] transition-colors"
              style={{ borderBottom: i < recentEvents.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: entry.color, boxShadow: `0 0 8px ${entry.color}` }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{entry.text}</p>
                {entry.sub && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{entry.sub}</p>}
                {entry.tx && (
                  <a href={`https://testnet.arcscan.app/tx/${entry.tx}`} target="_blank" rel="noreferrer"
                    className="text-[10px] font-mono mt-1 inline-block hover:underline" style={{ color: "rgba(103,232,249,0.7)" }}>
                    {entry.tx.slice(0, 14)}…{entry.tx.slice(-8)} ↗
                  </a>
                )}
              </div>
              {entry.block && (
                <span className="text-[10px] font-mono shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                  #{entry.block.toString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
