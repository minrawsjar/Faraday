import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPublicClient, http, parseAbi } from "viem";
import { z } from "zod";

const ARC_RPC = process.env.ARC_RPC_URL ?? "";
const REGISTRY_ADDRESS = (process.env.POSITION_REGISTRY_ADDRESS ?? "") as `0x${string}`;

const REGISTRY_ABI = parseAbi([
  "function totalPositions() external view returns (uint256)",
  "function getPosition(uint256 id) external view returns (address user, uint8 protocol, uint32 chainId, uint256 triggerHF, uint256 targetHF, bool active)",
  "function getUserPositions(address user) external view returns (uint256[])",
]);

const arcChain = {
  id: 5038930,
  name: "ARC",
  nativeCurrency: { name: "ARC", symbol: "ARC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC] } },
} as const;

const client = createPublicClient({ chain: arcChain, transport: http(ARC_RPC) });

const server = new McpServer({
  name: "faraday",
  version: "0.1.0",
});

server.tool(
  "get_position",
  "Get details of a Faraday-monitored position by ID",
  { id: z.number().describe("Position ID") },
  async ({ id }) => {
    const [user, protocol, chainId, triggerHF, targetHF, active] =
      await client.readContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "getPosition",
        args: [BigInt(id)],
      });

    const protocolName = ["AAVE", "VENUS", "GMX"][protocol] ?? "UNKNOWN";

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id,
          user,
          protocol: protocolName,
          chainId,
          triggerHF: (Number(triggerHF) / 1e18).toFixed(2),
          targetHF: (Number(targetHF) / 1e18).toFixed(2),
          active,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_user_positions",
  "Get all position IDs registered by a user address",
  { address: z.string().describe("User wallet address (0x...)") },
  async ({ address }) => {
    const ids = await client.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "getUserPositions",
      args: [address as `0x${string}`],
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ address, positionIds: ids.map(String) }, null, 2),
      }],
    };
  }
);

server.tool(
  "total_positions",
  "Get the total number of positions registered in Faraday",
  {},
  async () => {
    const total = await client.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "totalPositions",
    });

    return {
      content: [{ type: "text", text: String(total) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[Faraday MCP] Server running on stdio");
