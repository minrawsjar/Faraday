"use client";

import { useAccount } from "wagmi";
import { useUserPositions } from "@/hooks/usePositions";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  42161: "Arbitrum",
  56: "BNB",
  11155111: "Sepolia",
  421614: "Arb Sepolia",
  97: "BNB Testnet",
};

function HFBadge({ hf, trigger }: { hf: number; trigger: number }) {
  const ratio = hf / trigger;
  const color =
    hf < 1.1 ? "bg-red-500" :
    hf < trigger ? "bg-orange-500" :
    ratio < 1.2 ? "bg-yellow-500" :
    "bg-green-500";

  const label =
    hf < 1.1 ? "CRITICAL" :
    hf < trigger ? "AT RISK" :
    ratio < 1.2 ? "WATCH" :
    "SAFE";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
      {label}
    </span>
  );
}

export function PositionsPanel({ onRegister }: { onRegister: () => void }) {
  const { address } = useAccount();
  const { positions } = useUserPositions(address);

  if (positions.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Protected Positions</h2>
          <button
            onClick={onRegister}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors"
          >
            + Add Position
          </button>
        </div>
        <div className="text-center py-10 text-gray-500">
          <p className="text-4xl mb-3">🛡</p>
          <p>No positions protected yet.</p>
          <p className="text-sm mt-1">Add a DeFi position to start monitoring.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold">Protected Positions</h2>
        <button
          onClick={onRegister}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors"
        >
          + Add Position
        </button>
      </div>
      <div className="space-y-3">
        {positions.filter(p => p.active).map((position) => (
          <div
            key={position.id.toString()}
            className="flex items-center justify-between p-4 rounded-xl bg-gray-800 border border-gray-700"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{position.protocol}</span>
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
                  {CHAIN_NAMES[position.chainId] ?? `Chain ${position.chainId}`}
                </span>
              </div>
              <span className="text-xs text-gray-500 font-mono">
                {position.user.slice(0, 8)}…{position.user.slice(-6)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <HFBadge hf={position.triggerHF * 1.1} trigger={position.triggerHF} />
              <span className="text-xs text-gray-500">
                Trigger: {position.triggerHF.toFixed(2)} → {position.targetHF.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
