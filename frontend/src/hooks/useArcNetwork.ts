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

  /** Switch to ARC chain, adding/updating it in the wallet first.
   * Always calls wallet_addEthereumChain directly — MetaMask will add+switch
   * if the chain isn't known, or update+switch if it already exists.
   * Note: MetaMask requires decimals === 18 for nativeCurrency regardless of
   * the chain's actual precision. */
  async function switchToARC() {
    const eth = getEthereum();
    if (!eth) { console.warn("No injected wallet found"); return; }
    try {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: ARC_CHAIN_ID_HEX,
          chainName: "ARC Testnet",
          nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
          rpcUrls: [ARC_RPC_FOR_METAMASK],
          blockExplorerUrls: ["https://testnet.arcscan.app"],
        }],
      });
    } catch (err) {
      console.error("Failed to add/switch to ARC network:", err);
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
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: ARC_CHAIN_ID_HEX,
          chainName: "ARC Testnet",
          nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
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
