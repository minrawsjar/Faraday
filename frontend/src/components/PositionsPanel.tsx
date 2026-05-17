"use client";

import { useAccount } from "wagmi";
import { useUserPositions } from "@/hooks/usePositions";
import { useDetectPositions, type DetectedPosition } from "@/hooks/useDetectPositions";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum", 42161: "Arbitrum", 56: "BNB",
  11155111: "Sepolia", 421614: "Arb Sepolia",
  97: "BNB Testnet", 84532: "Base Sepolia",
};

const glass = {
  background: "linear-gradient(127deg, rgba(6,11,40,0.94) 0%, rgba(10,14,35,0.6) 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(40px)",
};

function hfStatus(hf: number, trigger: number) {
  if (hf < 1.1)             return { label: "CRITICAL", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" };
  if (hf < trigger)         return { label: "AT RISK",  color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" };
  if (hf < trigger * 1.15)  return { label: "WATCH",    color: "#eab308", bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.3)" };
  return                           { label: "SAFE",      color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" };
}

function HFBar({ hf, trigger }: { hf: number; trigger: number }) {
  const pct = Math.min((hf / 3) * 100, 100);
  const s = hfStatus(hf, trigger);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${s.color}88, ${s.color})` }} />
      </div>
      <span className="text-sm font-bold tabular-nums" style={{ color: s.color }}>{hf.toFixed(2)}</span>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
        {s.label}
      </span>
    </div>
  );
}

function DetectedCard({ pos, onProtect }: { pos: DetectedPosition; onProtect: (p: DetectedPosition) => void }) {
  const s = hfStatus(pos.healthFactor, 1.3);
  return (
    <div className="px-6 py-4 border-b last:border-0 transition-colors hover:bg-white/[0.02]"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{pos.label.split("·")[0].trim()}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {CHAIN_NAMES[pos.chainId] ?? `Chain ${pos.chainId}`}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
              ${pos.collateralUsd.toFixed(2)} collateral · ${pos.debtUsd.toFixed(2)} debt
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="text-right">
            <div className="text-lg font-black tabular-nums" style={{ color: s.color }}>
              {pos.healthFactor > 99 ? "∞" : pos.healthFactor.toFixed(2)}
            </div>
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>HF</div>
          </div>
          <button onClick={() => onProtect(pos)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))", border: "1px solid rgba(6,182,212,0.3)", color: "#67e8f9" }}>
            + Protect
          </button>
        </div>
      </div>
    </div>
  );
}

export function PositionsPanel({
  onRegister,
  onRegisterWithPosition,
}: {
  onRegister: () => void;
  onRegisterWithPosition: (pos: DetectedPosition) => void;
}) {
  const { address } = useAccount();
  const { positions } = useUserPositions(address);
  const { positions: detected, loading: detecting } = useDetectPositions(address);
  const active = positions.filter((p) => p.active);
  const detectedUnprotected = detected.filter(
    (d) => !active.some((a) => a.chainId === d.chainId && a.protocol === "AAVE")
  );

  return (
    <div className="rounded-2xl overflow-hidden" style={glass}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg font-bold text-white">Positions</h2>
          {active.length > 0 && (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "#67e8f9" }}>
              {active.length} protected
            </span>
          )}
        </div>
        <button onClick={onRegister}
          className="text-xs px-3 py-1.5 rounded-xl transition-all font-medium"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
          + Add manually
        </button>
      </div>

      {/* Detected section */}
      {(detecting || detectedUnprotected.length > 0) && (
        <>
          <div className="px-6 py-2.5 flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.3)" }}>
              Detected open positions
            </span>
            {detecting && <span className="w-3 h-3 rounded-full border border-cyan-500/40 border-t-cyan-400 animate-spin" />}
          </div>
          {detectedUnprotected.map((pos) => (
            <DetectedCard key={`${pos.chainId}-${pos.protocol}`} pos={pos} onProtect={onRegisterWithPosition} />
          ))}
          {!detecting && detectedUnprotected.length === 0 && (
            <p className="px-6 py-3 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              No unprotected positions found on supported testnets.
            </p>
          )}
        </>
      )}

      {/* Protected section */}
      {active.length > 0 && (
        <>
          <div className="px-6 py-2.5"
            style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.04)", borderTop: detectedUnprotected.length > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
            <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.3)" }}>
              Protected by Faraday
            </span>
          </div>
          <div>
            {active.map((position) => (
              <div key={position.id.toString()}
                className="px-6 py-5 transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black"
                      style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))", border: "1px solid rgba(6,182,212,0.2)", color: "#67e8f9" }}>
                      {position.protocol[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">{position.protocol}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {CHAIN_NAMES[position.chainId] ?? `Chain ${position.chainId}`}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399" }}>
                          ✓ active
                        </span>
                      </div>
                      <p className="text-xs font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {position.user.slice(0, 10)}…{position.user.slice(-6)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                    <div>Trigger <span className="font-mono text-white/60">{position.triggerHF.toFixed(2)}</span></div>
                    <div>Target <span className="font-mono text-white/60">{position.targetHF.toFixed(2)}</span></div>
                  </div>
                </div>
                {(() => {
                  if (detecting) return (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      <span className="w-3 h-3 rounded-full border border-cyan-500/40 border-t-cyan-400 animate-spin" />
                      Fetching live HF…
                    </div>
                  );
                  const live = detected.find((d) => d.chainId === position.chainId);
                  return live
                    ? <HFBar hf={live.healthFactor} trigger={position.triggerHF} />
                    : <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>No active position found on this chain</p>;
                })()}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!detecting && active.length === 0 && detectedUnprotected.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            🛡
          </div>
          <p className="text-white font-semibold mb-2">No positions found</p>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
            Open a position on Aave, Venus, or GMX testnets,<br />or register one manually.
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <a href="https://app.aave.com" target="_blank" rel="noreferrer"
              className="px-4 py-2 rounded-xl text-xs transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
              Aave ↗
            </a>
            <a href="https://testnet.venus.io" target="_blank" rel="noreferrer"
              className="px-4 py-2 rounded-xl text-xs transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
              Venus ↗
            </a>
            <button onClick={onRegister}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
              style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", color: "#67e8f9" }}>
              Add manually →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
