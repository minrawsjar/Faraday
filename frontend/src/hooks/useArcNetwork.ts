"use client";

import { useChainId } from "wagmi";

const ARC_CHAIN_ID = 5042002;
const ARC_RPC = process.env.NEXT_PUBLIC_ARC_RPC_URL!;

export function useArcNetwork() {
  const chainId = useChainId();
  const onARC = chainId === ARC_CHAIN_ID;

  async function switchToARC() {
    const eth = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!eth) return;
    try {
      // Always call addEthereumChain — it updates the RPC if the chain already exists
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x4CEF52",
          chainName: "ARC Testnet",
          nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
          rpcUrls: [ARC_RPC],
          blockExplorerUrls: ["https://testnet.arcscan.app"],
        }],
      });
    } catch (e) {
      console.error("Failed to add ARC network:", e);
    }
  }

  return { onARC, switchToARC };
}
