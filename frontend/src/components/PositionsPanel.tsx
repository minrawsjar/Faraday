"use client";

import { useAccount } from "wagmi";
import { useUserPositions } from "@/hooks/usePositions";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum", 42161: "Arbitrum", 56: "BNB",
  11155111: "Sepolia", 421614: "Arb Sepolia",
  97: "BNB Testnet", 84532: "Base Sepolia",
};

function HFGauge({ hf, trigger }: { hf: number; trigger: number }) {
  const capped = Math.min(hf, 3);
  const pct = (capped / 3) * 100;
  const isRisk = hf < trigger;
  const isCritical = hf < 1.1;
  const isWatch = hf < trigger * 1.15 && !isRisk;

  const color = isCritical ? "#ef4444" : isRisk ? "#f97316" : isWatch ? "#eab308" : "#10b981";
  const label = isCritical ? "CRITICAL" : isRisk ? "AT RISK" : isWatch ? "WATCH" : "SAFE";
  const bgColor = isCritical ? "bg-red-500/15 border-red-500/30" :
    isRisk ? "bg-orange-500/15 border-orange-500/30" :
    isWatch ? "bg-yellow-500/15 border-yellow-500/30" :
    "bg-emerald-500/15 border-emerald-500/30";
  const textColor = isCritical ? "text-red-400" : isRisk ? "text-orange-400" : isWatch ? "text-yellow-400" : "text-emerald-400";

  return (
    <div className="flex items-center gap-3">
      {/* Gauge bar */}
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className={`text-sm font-bold tabular-nums`} style={{ color }}>{hf.toFixed(2)}</span>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${bgColor} ${textColor}`}>
        {label}
      </span>
    </div>
  );
}

export function PositionsPanel({ onRegister }: { onRegister: () => void }) {
  const { address } = useAccount();
  const { positions } = useUserPositions(address);
  const active = positions.filter((p) => p.active);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] backdrop-blur-sm overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold text-white">Protected Positions</h2>
          {active.length > 0 && (
            <span className="text-xs bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-2 py-0.5 rounded-full">
              {active.length}
            </span>
          )}
        </div>
        <button
          onClick={onRegister}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          + Add Position
        </button>
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-4">
            🛡
          </div>
          <p className="text-white font-medium mb-1">No positions protected yet</p>
          <p className="text-sm text-gray-600">Add a DeFi position to start autonomous monitoring</p>
          <button
            onClick={onRegister}
            className="mt-6 px-6 py-2.5 rounded-xl border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/10 transition-colors"
          >
            Register your first position →
          </button>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {active.map((position) => (
            <div key={position.id.toString()} className="px-6 py-5 hover:bg-white/[0.02] transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-sm font-bold text-cyan-400">
                    {position.protocol[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{position.protocol}</span>
                      <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
                        {CHAIN_NAMES[position.chainId] ?? `Chain ${position.chainId}`}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 font-mono mt-0.5">
                      {position.user.slice(0, 10)}…{position.user.slice(-6)}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <div>Trigger <span className="text-gray-400 font-mono">{position.triggerHF.toFixed(2)}</span></div>
                  <div>Target <span className="text-gray-400 font-mono">{position.targetHF.toFixed(2)}</span></div>
                </div>
              </div>
              <HFGauge hf={position.triggerHF * 1.03} trigger={position.triggerHF} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
