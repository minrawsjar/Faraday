"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Faraday</h1>
        <p className="mt-2 text-gray-400 text-lg">
          Autonomous liquidation protection for your DeFi positions
        </p>
      </div>

      {isConnected ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-400">
            Connected: {address?.slice(0, 6)}…{address?.slice(-4)}
          </p>
          <button
            onClick={() => disconnect()}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
          >
            Disconnect
          </button>
          <p className="text-gray-500 text-sm">Dashboard coming soon</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium"
            >
              Connect {connector.name}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
