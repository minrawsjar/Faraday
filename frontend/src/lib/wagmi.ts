import { createConfig, http } from "wagmi";
import { mainnet, arbitrum, bsc } from "wagmi/chains";
import { defineChain } from "viem";
import { injected, metaMask } from "wagmi/connectors";

export const arcTestnet = defineChain({
  id: 5038930,
  name: "ARC",
  nativeCurrency: { name: "ARC", symbol: "ARC", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_ARC_RPC_URL ?? ""] },
  },
});

export const wagmiConfig = createConfig({
  chains: [arcTestnet, mainnet, arbitrum, bsc],
  connectors: [injected(), metaMask()],
  transports: {
    [arcTestnet.id]: http(process.env.NEXT_PUBLIC_ARC_RPC_URL),
    [mainnet.id]:    http(process.env.NEXT_PUBLIC_ETH_RPC_URL),
    [arbitrum.id]:   http(process.env.NEXT_PUBLIC_ARB_RPC_URL),
    [bsc.id]:        http(process.env.NEXT_PUBLIC_BNB_RPC_URL),
  },
});
