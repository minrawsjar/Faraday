import "dotenv/config";

function require(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

export const config = {
  chains: {
    arc:      { rpc: require("ARC_RPC_URL"),      id: 5042002 },
    ethereum: { rpc: require("ETH_RPC_URL"),      id: 11155111 }, // Sepolia
    arbitrum: { rpc: require("ARB_RPC_URL"),      id: 421614   }, // Arb Sepolia
    bnb:      { rpc: require("BNB_RPC_URL"),      id: 97       }, // BNB Testnet
  },
  contracts: {
    vault:    require("FARADAY_VAULT_ADDRESS")    as `0x${string}`,
    registry: require("POSITION_REGISTRY_ADDRESS") as `0x${string}`,
  },
  circle: {
    apiKey:   require("CIRCLE_API_KEY"),
    walletId: process.env.CIRCLE_WALLET_ID ?? "",
  },
  gemini: {
    apiKey:   require("GEMINI_API_KEY"),
  },
  agent: {
    pollIntervalMs: 30_000,
  },
};
