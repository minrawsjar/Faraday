"use client";

import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function ConnectButton() {
  const { connect, isPending } = useConnect();

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold text-lg transition-colors"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
