"use client";

import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { PositionsPanel } from "./PositionsPanel";
import { RegisterPosition } from "./RegisterPosition";
import { ReservePanel } from "./ReservePanel";
import { useUserPositions } from "@/hooks/usePositions";

export function Dashboard() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [showRegister, setShowRegister] = useState(false);
  const { refetch } = useUserPositions(address);

  return (
    <div className="min-h-screen bg-[#020810] text-white">
      {/* Ambient glow blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <span className="font-display text-xl font-black tracking-widest text-cyan-400 uppercase">Faraday</span>
          <span className="text-xs text-gray-600 font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Agent active
          </div>
          <button
            onClick={() => disconnect()}
            className="text-xs text-gray-600 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Disconnect
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Welcome row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Protection Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your positions are being monitored every 30 seconds</p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <PositionsPanel onRegister={() => setShowRegister(true)} />
          </div>
          <div>
            <ReservePanel />
          </div>
        </div>
      </div>

      {showRegister && (
        <RegisterPosition
          onClose={() => setShowRegister(false)}
          onSuccess={() => { setShowRegister(false); refetch(); }}
        />
      )}
    </div>
  );
}
