"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { isConnected } = useAccount();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight">Faraday</h1>
            <p className="mt-3 text-gray-400 text-lg max-w-md">
              Autonomous cross-chain liquidation protection for your DeFi positions
            </p>
          </div>
          <ConnectButton />
        </div>
      ) : (
        <Dashboard />
      )}
    </main>
  );
}
