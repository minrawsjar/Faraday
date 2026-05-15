"use client";

import { useChainId } from "wagmi";

const ARC_CHAIN_ID = 5042002;
// MetaMask needs an absolute URL — use the public Canteen endpoint
const ARC_RPC_FOR_METAMASK = "https://rpc.testnet.arc.network";

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
          rpcUrls: [ARC_RPC_FOR_METAMASK],
          blockExplorerUrls: ["https://testnet.arcscan.app"],
        }],
      });
    } catch (e) {
      console.error("Failed to add ARC network:", e);
    }
  }

  return { onARC, switchToARC };
}
