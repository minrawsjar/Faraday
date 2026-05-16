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
const MIN_LIQUID_BUFFER = 200;

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

function splitPreview(currentLiquidFloat: number, depositAmount: number) {
  const space = Math.max(0, MIN_LIQUID_BUFFER - currentLiquidFloat);
  const toLiquid = Math.min(depositAmount, space);
  const toUsyc = Math.max(0, depositAmount - toLiquid);
  return { toLiquid, toUsyc };
}

const glass = {
  background: "linear-gradient(127deg, rgba(6,11,40,0.94) 0%, rgba(10,14,35,0.6) 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(40px)",
};

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

  const parsedAmount = (() => { try { return amount ? parseUnits(amount, 6) : 0n; } catch { return 0n; } })();
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

  const liquidUsdc  = reserves ? (reserves as [bigint, bigint])[0] : 0n;
  const usycShares  = reserves ? (reserves as [bigint, bigint])[1] : 0n;
  const totalFloat  = parseFloat(formatUnits(totalReserve ?? 0n, 6));
  const liquidFloat = parseFloat(formatUnits(liquidUsdc, 6));
  const usycFloat   = parseFloat(formatUnits(usycShares, 6));
  const walletFloat = parseFloat(formatUnits(usdcBalance ?? 0n, 6));
  const liquidPct   = totalFloat > 0 ? (liquidFloat / totalFloat) * 100 : 0;
  const usycPct     = totalFloat > 0 ? (usycFloat  / totalFloat) * 100 : 0;

  const depositAmountFloat = parseFloat(amount) || 0;
  const preview = splitPreview(liquidFloat, depositAmountFloat);

  return (
    <div className="rounded-2xl overflow-hidden" style={glass}>

      {/* Vault header with gradient */}
      <div className="px-6 pt-6 pb-5"
        style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(59,130,246,0.05) 100%)" }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-1">Protection Vault</p>
            <p className="text-4xl font-black text-white tabular-nums">${totalFloat.toFixed(2)}</p>
            <p className="text-xs text-white/30 mt-1">total reserve · ARC network</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full mt-1"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}>
            ~5% APY
          </span>
        </div>

        {/* Split bar */}
        <div className="space-y-2">
          <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full transition-all duration-700"
              style={{ width: `${liquidPct}%`, background: "linear-gradient(90deg, #3b82f6, #60a5fa)" }} />
            <div className="h-full transition-all duration-700"
              style={{ width: `${usycPct}%`, background: "linear-gradient(90deg, #06b6d4, #22d3ee)" }} />
          </div>
          <div className="flex justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-[10px] text-white/40">Liquid ${liquidFloat.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-[10px] text-white/40">USYC {usycFloat.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

      <div className="px-6 py-5 space-y-4">

        {!onARC && (
          <div className="p-3 rounded-xl text-xs"
            style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", color: "#facc15" }}>
            Switch to ARC Testnet to manage vault.{" "}
            <button onClick={switchToARC} className="underline font-semibold">Switch →</button>
          </div>
        )}

        {/* Mode tabs */}
        <div className="flex rounded-xl overflow-hidden p-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {(["deposit","withdraw"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 py-2 text-xs font-semibold capitalize transition-all rounded-lg"
              style={mode === m
                ? { background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.2))", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.2)" }
                : { color: "rgba(255,255,255,0.3)" }
              }>
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
              className="w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all pr-20"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              onFocus={e => (e.target.style.borderColor = "rgba(6,182,212,0.4)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-xs text-white/30">USDC</span>
              {mode === "deposit" && usdcBalance != null && usdcBalance > 0n && (
                <button onClick={() => setAmount(formatUnits(usdcBalance, 6))}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors"
                  style={{ background: "rgba(6,182,212,0.15)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.2)" }}>
                  MAX
                </button>
              )}
            </div>
          </div>

          {mode === "deposit" && usdcBalance != null && (
            <p className="text-xs text-white/25">Wallet balance: {walletFloat.toFixed(2)} USDC</p>
          )}

          {/* Deposit split preview */}
          {mode === "deposit" && depositAmountFloat > 0 && (
            <div className="rounded-xl p-3 space-y-2"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] text-white/30 uppercase tracking-widest">Split preview</p>
              <div className="flex justify-between text-xs">
                <span className="text-blue-400">→ Stays liquid (buffer)</span>
                <span className="text-white font-mono font-bold">${preview.toLiquid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cyan-400">→ Deposited to USYC</span>
                <span className="text-cyan-300 font-mono font-bold">${preview.toUsyc.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={handleAction}
          disabled={onARC && (!parsedAmount || isPending || isConfirming)}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-40 text-white"
          style={{ background: "linear-gradient(135deg, #0891b2, #2563eb)", boxShadow: "0 0 24px rgba(6,182,212,0.25)" }}
        >
          {!onARC ? "Switch to ARC Testnet" :
           isPending ? "Confirm in wallet…" :
           isConfirming ? "Confirming…" :
           needsApproval ? "Approve USDC" :
           mode === "deposit" ? "Deposit to Vault" : "Withdraw"}
        </button>

        {txHash && (
          <div className="flex items-center justify-between text-xs">
            <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline truncate">
              View on ARC ↗
            </a>
            <button onClick={() => { reset(); setAmount(""); }} className="text-white/25 hover:text-white/50 ml-3 shrink-0">
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
