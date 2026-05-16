"use client";

import { useState } from "react";
import { useAccount, useDisconnect, useReadContract } from "wagmi";
import { parseAbi, formatUnits } from "viem";
import { Sidebar, type DashboardTab } from "./Sidebar";
import { ParticleGlobe } from "./ParticleGlobe";
import { PositionsPanel } from "./PositionsPanel";
import { RegisterPosition } from "./RegisterPosition";
import { ReservePanel } from "./ReservePanel";
import { AgentLogs } from "./AgentLogs";
import { useUserPositions } from "@/hooks/usePositions";
import { useArcNetwork } from "@/hooks/useArcNetwork";
import { useDetectPositions } from "@/hooks/useDetectPositions";
import type { DetectedPosition } from "@/hooks/useDetectPositions";

const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;
const VAULT_ABI = parseAbi([
  "function totalReserve(address user) external view returns (uint256)",
]);

const TAB_TITLES: Record<DashboardTab, { title: string; sub: string }> = {
  dashboard: { title: "Protection Dashboard", sub: "Overview of vault, positions, and agent status" },
  logs:      { title: "Agent Logs",           sub: "On-chain activity history from your positions and vault" },
};

function HeroStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center gap-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
      }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <div>
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
        <p className="text-sm font-bold text-white tabular-nums leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: string }) {
  return (
    <div className="rounded-2xl p-5 flex items-center justify-between"
      style={{
        background: "linear-gradient(127deg, rgba(6,11,40,0.92) 0%, rgba(10,14,35,0.65) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div>
        <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</p>
        <p className="text-2xl font-black text-white tabular-nums leading-none">{value}</p>
        {sub && <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</p>}
      </div>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: "linear-gradient(135deg, #0891b2, #2563eb)", boxShadow: "0 4px 20px rgba(6,182,212,0.35)" }}>
        {icon}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { onARC, switchToARC } = useArcNetwork();
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");
  const [showRegister, setShowRegister] = useState(false);
  const [prefillPosition, setPrefillPosition] = useState<DetectedPosition | undefined>();
  const { positions, refetch } = useUserPositions(address);
  const { positions: detected } = useDetectPositions(address);

  const { data: totalReserve } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "totalReserve",
    args: address ? [address] : undefined,
    query: { enabled: !!address && onARC, refetchInterval: 15_000 },
  });

  const activeCount = positions.filter((p) => p.active).length;
  const detectedUnprotectedCount = detected.filter(
    (d) => !positions.some((p) => p.chainId === d.chainId && p.protocol === "AAVE")
  ).length;
  const reserveFloat = parseFloat(formatUnits(totalReserve ?? 0n, 6));

  function openRegister(pos?: DetectedPosition) {
    setPrefillPosition(pos);
    setShowRegister(true);
  }
  function closeRegister() {
    setShowRegister(false);
    setPrefillPosition(undefined);
  }

  const title = TAB_TITLES[activeTab];

  return (
    <div className="flex min-h-screen" style={{ background: "#060c1e" }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 ml-[240px] flex flex-col">

        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(6,12,30,0.85)", backdropFilter: "blur(20px)" }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            <span className="hover:text-white transition-colors cursor-pointer" onClick={() => setActiveTab("dashboard")}>Dashboards</span>
            <span className="mx-2" style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
            <span className="text-white font-medium">{title.title}</span>
          </p>
          <div className="flex items-center gap-3">
            {!onARC ? (
              <button
                onClick={switchToARC}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#0a0a0a",
                  boxShadow: "0 0 12px rgba(245,158,11,0.4)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-200 animate-pulse" />
                Switch to ARC Testnet
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Agent live · on ARC
              </div>
            )}
            <span className="text-xs font-mono px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
            <button onClick={() => disconnect()}
              className="text-xs px-3 py-1.5 rounded-xl transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              Disconnect
            </button>
          </div>
        </header>

        {/* Dashboard tab: hero + globe + stats */}
        {activeTab === "dashboard" && (
          <div className="relative overflow-hidden shrink-0" style={{ minHeight: 720, background: "#060c1e" }}>
            <div className="absolute pointer-events-none"
              style={{
                right: -200, top: -150,
                width: 1100, height: 1100,
                background: "radial-gradient(circle at center, rgba(30, 64, 175, 0.45) 0%, rgba(30, 64, 175, 0.25) 25%, rgba(15, 23, 100, 0.1) 50%, transparent 75%)",
                filter: "blur(20px)",
              }}
            />
            <div className="absolute" style={{ right: -180, top: -100, width: 1000, height: 1000, cursor: "grab" }}>
              <ParticleGlobe className="w-full h-full" />
            </div>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(90deg, #060c1e 30%, rgba(6,12,30,0.4) 55%, transparent 80%)" }} />
            <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
              style={{ background: "linear-gradient(to top, #060c1e, transparent)" }} />

            <div className="relative z-10 px-8 py-8">
              <p className="text-[11px] mb-7 uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.28)" }}>
                Monitoring every 30s · ARC ↔ Base · Ethereum · Arbitrum · BNB
              </p>
              <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 540 }}>
                <StatCard label="Total Reserve"       value={`$${reserveFloat.toFixed(2)}`} sub="on ARC vault"       icon="💰" />
                <StatCard label="Protected Positions" value={String(activeCount)}            sub="active positions"  icon="🛡" />
                <StatCard label="USYC Yield"          value="~5% APY"                        sub="idle reserves earn" icon="📈" />
                <StatCard label="ARC Response"        value="< 500ms"                        sub="sub-second finality" icon="⚡" />
              </div>
            </div>
          </div>
        )}

        {/* Non-dashboard tabs: bold page hero with stats */}
        {activeTab !== "dashboard" && (
          <div className="relative px-8 pt-12 pb-8 shrink-0 overflow-hidden"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

            {/* Subtle background gradient orb on the right */}
            <div className="absolute pointer-events-none"
              style={{
                right: -100, top: -50, width: 500, height: 500,
                background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />

            <div className="relative z-10 max-w-5xl">
              <p className="text-[11px] uppercase tracking-[0.22em] mb-3 font-bold"
                style={{ color: "rgba(103,232,249,0.7)" }}>
                {activeTab === "logs" && "Activity"}
              </p>
              <h1 className="font-display text-5xl font-bold text-white mb-3 tracking-tight">
                {title.title}
              </h1>
              <p className="text-base max-w-2xl" style={{ color: "rgba(255,255,255,0.45)" }}>
                {title.sub}
              </p>

              {/* Inline stat badges per tab */}
              <div className="flex flex-wrap gap-3 mt-7">
                {activeTab === "logs" && (
                  <>
                    <HeroStat label="Window" value="Last 2k blocks" color="#06b6d4" />
                    <HeroStat label="Refresh" value="every 20s"     color="#3b82f6" />
                    <HeroStat label="Source"   value="On-chain only" color="#8b5cf6" />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main content area by tab */}
        <div className="flex-1 px-8 pb-8 pt-2">
          {activeTab === "dashboard" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              <div className="lg:col-span-2">
                <PositionsPanel
                  onRegister={() => openRegister()}
                  onRegisterWithPosition={(pos) => openRegister(pos)}
                />
              </div>
              <div>
                <ReservePanel />
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="max-w-4xl">
              <AgentLogs />
            </div>
          )}
        </div>
      </div>

      {showRegister && (
        <RegisterPosition
          onClose={closeRegister}
          onSuccess={() => { closeRegister(); refetch(); }}
          prefillPosition={prefillPosition}
        />
      )}
    </div>
  );
}
