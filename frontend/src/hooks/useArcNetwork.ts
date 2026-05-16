"use client";

import { useChainId } from "wagmi";

const ARC_CHAIN_ID = 5042002;
const ARC_CHAIN_ID_HEX = "0x4CEF52";
// MetaMask needs an absolute URL — use the public Canteen endpoint
const ARC_RPC_FOR_METAMASK = "https://rpc.testnet.arc.network";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEthereum(): EthereumProvider | undefined {
  return (window as Window & { ethereum?: EthereumProvider }).ethereum;
}

export function useArcNetwork() {
  const chainId = useChainId();
  const onARC = chainId === ARC_CHAIN_ID;

  /** Switch to ARC chain, adding it first if the wallet doesn't know about it yet. */
  async function switchToARC() {
    const eth = getEthereum();
    if (!eth) return;
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARC_CHAIN_ID_HEX }],
      });
    } catch (switchErr) {
      // 4902 = chain not added yet; add it (wallet will also switch automatically)
      if ((switchErr as { code?: number }).code === 4902) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: ARC_CHAIN_ID_HEX,
              chainName: "ARC Testnet",
              nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
              rpcUrls: [ARC_RPC_FOR_METAMASK],
              blockExplorerUrls: ["https://testnet.arcscan.app"],
            }],
          });
        } catch (addErr) {
          console.error("Failed to add ARC network:", addErr);
        }
      } else {
        console.error("Failed to switch to ARC network:", switchErr);
      }
    }
  }

  /**
   * Force the wallet to update its RPC for ARC chain. Useful when a previously cached
   * (broken) RPC is returning "Internal JSON-RPC error" on transactions.
   * Note: most wallets silently update if the chain already exists; some require a switch first.
   */
  async function reAddARC() {
    const eth = getEthereum();
    if (!eth) return;
    try {
      // Switch away (to Sepolia) and back, then re-add to force the new RPC config
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
      } catch { /* ignore — user may not have Sepolia */ }
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: ARC_CHAIN_ID_HEX,
          chainName: "ARC Testnet",
          nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
          rpcUrls: [ARC_RPC_FOR_METAMASK],
          blockExplorerUrls: ["https://testnet.arcscan.app"],
        }],
      });
    } catch (e) {
      console.error("Failed to re-add ARC network:", e);
    }
  }

  return { onARC, switchToARC, reAddARC };
}
