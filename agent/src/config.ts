import "dotenv/config";

function require(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

export const config = {
  chains: {
    arc:      { rpc: require("ARC_RPC_URL"),      id: 5042002 },
    ethereum: { rpc: require("ETH_RPC_URL"),      id: 1 },
    arbitrum: { rpc: require("ARB_RPC_URL"),      id: 42161 },
    bnb:      { rpc: require("BNB_RPC_URL"),      id: 56 },
  },
  contracts: {
    vault:    require("FARADAY_VAULT_ADDRESS")    as `0x${string}`,
    registry: require("POSITION_REGISTRY_ADDRESS") as `0x${string}`,
  },
  circle: {
    apiKey:   require("CIRCLE_API_KEY"),
    walletId: require("CIRCLE_WALLET_ID"),
  },
  anthropic: {
    apiKey:   require("ANTHROPIC_API_KEY"),
  },
  agent: {
    pollIntervalMs: 30_000,
  },
};
