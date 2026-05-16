"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseAbi, isAddress } from "viem";
import { useDetectPositions, type DetectedPosition } from "@/hooks/useDetectPositions";
import { useArcNetwork } from "@/hooks/useArcNetwork";

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}`;

const REGISTRY_ABI = parseAbi([
  "function register(address user, uint8 protocol, uint32 chainId, uint256 triggerHF, uint256 targetHF) external returns (uint256 id)",
]);

const PROTOCOLS = [
  { label: "Aave v3 ·Base Sepolia",     value: 0, chainId: 84532 },
  { label: "Aave v3 ·Ethereum Sepolia", value: 0, chainId: 11155111 },
  { label: "Aave v3 ·Arbitrum Sepolia", value: 0, chainId: 421614 },
  { label: "Venus ·BNB Testnet",        value: 1, chainId: 97 },
];

function hfColor(hf: number) {
  if (hf > 999) return "text-gray-400";
  if (hf < 1.1) return "text-red-400";
  if (hf < 1.3) return "text-orange-400";
  if (hf < 1.5) return "text-yellow-400";
  return "text-emerald-400";
}

export function RegisterPosition({
  onClose,
  onSuccess,
  prefillPosition,
}: {
  onClose: () => void;
  onSuccess: () => void;
  prefillPosition?: DetectedPosition;
}) {
  const { address } = useAccount();
  const [userAddr, setUserAddr] = useState(address ?? "");
  const [protocolIdx, setProtocolIdx] = useState(() => {
    if (!prefillPosition) return 0;
    const idx = PROTOCOLS.findIndex(
      (p) => p.chainId === prefillPosition.chainId && p.value === prefillPosition.protocol
    );
    return idx !== -1 ? idx : 0;
  });
  const [triggerHF, setTriggerHF] = useState("1.3");
  const [targetHF, setTargetHF] = useState("1.5");

  const { positions, loading } = useDetectPositions(address);
  const { onARC, switchToARC, reAddARC } = useArcNetwork();

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) onSuccess();
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const errMessage = (() => {
    const e = writeError ?? receiptError;
    if (!e) return null;
    const msg = (e as Error).message ?? String(e);
    const shortMatch = msg.match(/(?:reverted with the following reason:|reason:)\s*([^\n]+)/i);
    return (shortMatch?.[1] ?? msg).slice(0, 200);
  })();

  const looksLikeRpcConfigError = errMessage?.toLowerCase().includes("internal json-rpc")
    || errMessage?.toLowerCase().includes("network does not match")
    || errMessage?.toLowerCase().includes("unknown account");

  function prefill(detected: { label: string; protocol: number; chainId: number }) {
    const idx = PROTOCOLS.findIndex(
      (p) => p.chainId === detected.chainId && p.value === detected.protocol
    );
    if (idx !== -1) setProtocolIdx(idx);
    setUserAddr(address ?? "");
  }

  const selected = PROTOCOLS[protocolIdx];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();

    if (!onARC) { switchToARC(); return; }
    if (!isAddress(userAddr)) return;

    const triggerF = parseFloat(triggerHF);
    const targetF  = parseFloat(targetHF);
    if (!Number.isFinite(triggerF) || !Number.isFinite(targetF)) return;
    if (targetF <= triggerF) return;

    const trigger = BigInt(Math.round(triggerF * 1e18));
    const target  = BigInt(Math.round(targetF  * 1e18));

    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "register",
      args: [userAddr as `0x${string}`, selected.value, selected.chainId, trigger, target],
    });
  }

  const triggerF = parseFloat(triggerHF);
  const targetF  = parseFloat(targetHF);
  const validInputs =
    isAddress(userAddr) &&
    Number.isFinite(triggerF) && Number.isFinite(targetF) &&
    targetF > triggerF &&
    triggerF >= 1.05 && triggerF <= 1.8 &&
    targetF >= 1.1;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a1628] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Register Position</h2>
            <p className="text-xs text-gray-600 mt-0.5">Add a DeFi position for Faraday to protect</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors">✕</button>
        </div>

        {/* Auto-detected positions */}
        {(loading || positions.length > 0) && (
          <div className="mb-5">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Detected positions</p>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-gray-600 py-3">
                <span className="w-3 h-3 rounded-full border border-cyan-500/50 border-t-cyan-400 animate-spin" />
                Scanning Aave markets…
              </div>
            ) : (
              <div className="space-y-2">
                {positions.map((pos) => (
                  <button
                    key={`${pos.chainId}-${pos.protocol}`}
                    type="button"
                    onClick={() => prefill(pos)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-left group"
                  >
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">{pos.label}</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        ${pos.collateralUsd.toFixed(2)} collateral · ${pos.debtUsd.toFixed(2)} debt
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className={`text-sm font-bold tabular-nums ${hfColor(pos.healthFactor)}`}>
                        {pos.healthFactor > 999 ? "∞" : pos.healthFactor.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-gray-600">HF</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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

          {!onARC && (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-xs">
              Wallet is not on ARC Testnet. Click below to switch.
            </div>
          )}

          {errMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs break-all space-y-2">
              <p>{errMessage}</p>
              {looksLikeRpcConfigError && (
                <div className="pt-2 border-t border-red-500/20">
                  <p className="text-red-300 mb-2">
                    This is almost always caused by a stale ARC RPC URL cached in your wallet.
                    Click below to re-add the ARC network with the correct RPC.
                  </p>
                  <button
                    type="button"
                    onClick={reAddARC}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-semibold transition-colors"
                  >
                    Re-add ARC chain
                  </button>
                </div>
              )}
            </div>
          )}

          {!validInputs && onARC && (
            <p className="text-xs text-gray-600">
              {!isAddress(userAddr) ? "Enter a valid wallet address." :
               targetF <= triggerF ? "Target HF must be greater than Trigger HF." :
               "Trigger HF must be 1.05–1.80, Target HF must be ≥ 1.10."}
            </p>
          )}

          <button
            type="submit"
            disabled={(onARC && !validInputs) || isPending || isConfirming}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors mt-2"
          >
            {!onARC ? "Switch to ARC Testnet" :
             isPending ? "Confirm in wallet…" :
             isConfirming ? "Confirming…" :
             "Register Position"}
          </button>
        </form>
      </div>
    </div>
  );
}
