"use client";

import { useEffect, useState } from "react";
import {
  useAccount, useReadContract, useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseAbi, parseUnits, formatUnits } from "viem";
import { useArcNetwork } from "@/hooks/useArcNetwork";

const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS  as `0x${string}`;
const USDC_ADDRESS  = process.env.NEXT_PUBLIC_USDC_ADDRESS   as `0x${string}`;

const VAULT_ABI = parseAbi([
  "function totalReserve(address user) external view returns (uint256)",
  "function reserves(address user) external view returns (uint256 liquidUsdc, uint256 usycShares)",
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external",
]);

const ERC20_ABI = parseAbi([
  "function balanceOf(address) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
]);

export function ReservePanel() {
  const { address } = useAccount();
  const { onARC, switchToARC } = useArcNetwork();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");

  const { data: totalReserve, refetch: refetchReserve } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "totalReserve",
    args: address ? [address] : undefined,
    query: { enabled: !!address && onARC, refetchInterval: 15_000 },
  });
  const { data: reserves, refetch: refetchReserves } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "reserves",
    args: address ? [address] : undefined,
    query: { enabled: !!address && onARC, refetchInterval: 15_000 },
  });
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && onARC, refetchInterval: 15_000 },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled: !!address && onARC },
  });

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      refetchReserve(); refetchReserves(); refetchAllowance(); refetchBalance();
      setAmount(""); reset();
    }
  }, [isConfirmed]); // eslint-disable-line

  const parsedAmount = (() => {
    try { return amount ? parseUnits(amount, 6) : 0n; } catch { return 0n; }
  })();

  const needsApproval = mode === "deposit" && parsedAmount > 0n && (allowance ?? 0n) < parsedAmount;

  function handleAction() {
    if (!parsedAmount) return;
    if (!onARC) { switchToARC(); return; }
    if (needsApproval) {
      writeContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve", args: [VAULT_ADDRESS, parsedAmount] });
    } else if (mode === "deposit") {
      writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "deposit", args: [parsedAmount] });
    } else {
      writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "withdraw", args: [parsedAmount] });
    }
  }

  const liquidUsdc = reserves ? (reserves as [bigint, bigint])[0] : 0n;
  const usycShares  = reserves ? (reserves as [bigint, bigint])[1] : 0n;
  const totalFloat  = parseFloat(formatUnits(totalReserve ?? 0n, 6));
  const liquidFloat = parseFloat(formatUnits(liquidUsdc, 6));
  const walletFloat = parseFloat(formatUnits(usdcBalance ?? 0n, 6));

  // Reserve health bar (out of, say, 1000 USDC as "full")
  const reservePct = Math.min((totalFloat / 100) * 100, 100);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] backdrop-blur-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="font-semibold text-white">Protection Reserve</h2>
      </div>

      <div className="px-6 py-5 space-y-5">
        {!onARC && (
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-xs">
            Switch to ARC Testnet to manage reserve.{" "}
            <button onClick={switchToARC} className="underline">Switch now</button>
          </div>
        )}

        {/* Reserve overview */}
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-xs text-gray-500">Total reserve</span>
            <span className="text-2xl font-black text-white">${totalFloat.toFixed(2)}</span>
          </div>
          {/* Health bar */}
          <div className="h-2 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
              style={{ width: `${reservePct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-xl p-3 border border-white/8">
              <div className="text-[10px] text-gray-600 mb-1">Liquid USDC</div>
              <div className="text-sm font-bold text-white">${liquidFloat.toFixed(2)}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/8">
              <div className="text-[10px] text-gray-600 mb-1">In USYC</div>
              <div className="text-sm font-bold text-cyan-400">{parseFloat(formatUnits(usycShares, 6)).toFixed(4)}</div>
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-xl border border-white/8 overflow-hidden bg-white/[0.02]">
          {(["deposit","withdraw"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 text-xs font-semibold capitalize transition-all ${
                mode === m ? "bg-cyan-500/20 text-cyan-400" : "text-gray-600 hover:text-gray-400"
              }`}>
              {m}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="number" placeholder="0.00" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-cyan-500/50 transition-colors pr-20"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-xs text-gray-600">USDC</span>
              {mode === "deposit" && usdcBalance != null && usdcBalance > 0n && (
                <button onClick={() => setAmount(formatUnits(usdcBalance, 6))}
                  className="text-[10px] text-cyan-500 hover:text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded transition-colors">
                  MAX
                </button>
              )}
            </div>
          </div>
          {mode === "deposit" && usdcBalance != null && (
            <p className="text-xs text-gray-700">Wallet: {walletFloat.toFixed(2)} USDC</p>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={handleAction}
          disabled={onARC && (!parsedAmount || isPending || isConfirming)}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-40
            bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
        >
          {!onARC ? "Switch to ARC Testnet" :
           isPending ? "Confirm in wallet…" :
           isConfirming ? "Confirming…" :
           needsApproval ? "Approve USDC" :
           mode === "deposit" ? "Deposit" : "Withdraw"}
        </button>

        {txHash && (
          <div className="flex items-center justify-between text-xs">
            <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer"
              className="text-cyan-500 hover:text-cyan-400 underline truncate">
              View on ARC explorer ↗
            </a>
            <button onClick={() => { reset(); setAmount(""); }} className="text-gray-700 hover:text-gray-500 ml-3 shrink-0">
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
