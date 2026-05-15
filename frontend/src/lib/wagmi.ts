import { createConfig, http } from "wagmi";
import { mainnet, arbitrum, bsc, arcTestnet } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";

export { arcTestnet };

// In the browser, proxy through /api/rpc to avoid CORS.
// The proxy reads ARC_RPC_URL server-side and forwards requests.
const arcTransport =
  typeof window !== "undefined"
    ? http(`${window.location.origin}/api/rpc`)
    : http(process.env.ARC_RPC_URL); // SSR fallback

export const wagmiConfig = createConfig({
  chains: [arcTestnet, mainnet, arbitrum, bsc],
  connectors: [injected(), metaMask()],
  transports: {
    [arcTestnet.id]: arcTransport,
    [mainnet.id]:    http(process.env.NEXT_PUBLIC_ETH_RPC_URL),
    [arbitrum.id]:   http(process.env.NEXT_PUBLIC_ARB_RPC_URL),
    [bsc.id]:        http(process.env.NEXT_PUBLIC_BNB_RPC_URL),
  },
});
