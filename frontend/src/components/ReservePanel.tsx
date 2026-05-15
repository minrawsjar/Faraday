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
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "totalReserve",
    args: address ? [address] : undefined,
    query: { enabled: !!address && onARC, refetchInterval: 15_000 },
  });

  const { data: reserves, refetch: refetchReserves } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "reserves",
    args: address ? [address] : undefined,
    query: { enabled: !!address && onARC, refetchInterval: 15_000 },
  });

  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && onARC, refetchInterval: 15_000 },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled: !!address && onARC },
  });

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      refetchReserve();
      refetchReserves();
      refetchAllowance();
      refetchBalance();
      setAmount("");
      reset();
    }
  }, [isConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsedAmount = (() => {
    try { return amount ? parseUnits(amount, 6) : 0n; }
    catch { return 0n; }
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

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="text-lg font-semibold mb-5">Protection Reserve</h2>

      {!onARC && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
          Switch to ARC Testnet to manage your reserve.
          <button onClick={switchToARC} className="ml-2 underline hover:no-underline">
            Switch now
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Total Reserve" value={`$${parseFloat(formatUnits(totalReserve ?? 0n, 6)).toFixed(2)}`} />
        <Stat label="Liquid USDC"   value={`$${parseFloat(formatUnits(liquidUsdc, 6)).toFixed(2)}`} />
        <Stat label="In USYC"       value={`${parseFloat(formatUnits(usycShares, 6)).toFixed(4)}`} dim />
      </div>

      <div className="flex rounded-xl overflow-hidden border border-gray-700 mb-4">
        {(["deposit", "withdraw"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
              mode === m ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="relative">
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 pr-20"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <span className="text-xs text-gray-500">USDC</span>
            {mode === "deposit" && usdcBalance != null && usdcBalance > 0n && (
              <button onClick={() => setAmount(formatUnits(usdcBalance, 6))} className="text-xs text-blue-400 hover:text-blue-300">
                MAX
              </button>
            )}
          </div>
        </div>

        {mode === "deposit" && usdcBalance != null && (
          <p className="text-xs text-gray-500">
            Wallet: {parseFloat(formatUnits(usdcBalance, 6)).toFixed(2)} USDC
          </p>
        )}

        <button
          onClick={handleAction}
          disabled={onARC && (!parsedAmount || isPending || isConfirming)}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold transition-colors"
        >
          {!onARC             ? "Switch to ARC Testnet"  :
           isPending          ? "Confirm in wallet…"     :
           isConfirming       ? "Confirming on-chain…"   :
           needsApproval      ? "Approve USDC"           :
           mode === "deposit" ? "Deposit"                : "Withdraw"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-semibold text-sm ${dim ? "text-gray-400" : "text-white"}`}>{value}</p>
    </div>
  );
}
