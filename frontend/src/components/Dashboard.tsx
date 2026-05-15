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
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Faraday</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Agent active
          </span>
          <button
            onClick={() => disconnect()}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>

      {showRegister && (
        <RegisterPosition
          onClose={() => setShowRegister(false)}
          onSuccess={() => { setShowRegister(false); refetch(); }}
        />
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <PositionsPanel onRegister={() => setShowRegister(true)} />
        </div>
        <div>
          <ReservePanel />
        </div>
      </div>
    </div>
  );
}
