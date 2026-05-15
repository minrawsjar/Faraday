"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseAbi } from "viem";

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}`;

const REGISTRY_ABI = parseAbi([
  "function register(address user, uint8 protocol, uint32 chainId, uint256 triggerHF, uint256 targetHF) external returns (uint256 id)",
]);

const PROTOCOLS = [
  { label: "Aave v3 — Base Sepolia",     value: 0, chainId: 84532 },
  { label: "Aave v3 — Ethereum Sepolia", value: 0, chainId: 11155111 },
  { label: "Aave v3 — Arbitrum Sepolia", value: 0, chainId: 421614 },
  { label: "Venus — BNB Testnet",        value: 1, chainId: 97 },
];

export function RegisterPosition({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { address } = useAccount();
  const [userAddr, setUserAddr] = useState(address ?? "");
  const [protocolIdx, setProtocolIdx] = useState(0);
  const [triggerHF, setTriggerHF] = useState("1.3");
  const [targetHF, setTargetHF] = useState("1.5");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) onSuccess();
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = PROTOCOLS[protocolIdx];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trigger = BigInt(Math.round(parseFloat(triggerHF) * 1e18));
    const target  = BigInt(Math.round(parseFloat(targetHF)  * 1e18));

    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "register",
      args: [userAddr as `0x${string}`, selected.value, selected.chainId, trigger, target],
    });
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a1628] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Register Position</h2>
            <p className="text-xs text-gray-600 mt-0.5">Add a DeFi position for Faraday to protect</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Wallet address to protect</label>
            <input
              type="text"
              value={userAddr}
              onChange={e => setUserAddr(e.target.value)}
              placeholder="0x..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Protocol & Chain</label>
            <select
              value={protocolIdx}
              onChange={e => setProtocolIdx(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            >
              {PROTOCOLS.map((p, i) => (
                <option key={i} value={i}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Trigger HF</label>
              <input
                type="number"
                step="0.01"
                min="1.05"
                max="1.8"
                value={triggerHF}
                onChange={e => setTriggerHF(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-600 mt-1">Agent fires below this</p>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Target HF</label>
              <input
                type="number"
                step="0.01"
                min="1.1"
                value={targetHF}
                onChange={e => setTargetHF(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-600 mt-1">Agent restores to this</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold transition-colors mt-2"
          >
            {isPending ? "Confirm in wallet…" : isConfirming ? "Confirming…" : "Register Position"}
          </button>
        </form>
      </div>
    </div>
  );
}
