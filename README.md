# Faraday

**An autonomous cross-chain liquidation protection agent for DeFi lenders.**

Faraday watches your open lending positions on Aave, Venus, and other money markets across multiple chains. The moment your Health Factor approaches liquidation, an AI agent moves USDC from its reserve on ARC to your wallet on the source chain — fast enough to prevent the liquidator from getting there first.

Built for the Agora Agents Hackathon (May 11–25, 2026) on the ARC network.

---

## The Problem

Over **$19 billion** of DeFi collateral has been liquidated since 2021. Liquidation isn't theft — it's the protocol working as designed — but it's brutal:

- Borrower loses 5–15% of their collateral as a liquidation penalty
- Liquidators front-run the borrower because they have **better infrastructure**
- The borrower could easily have topped up their position — they just didn't see it coming, or couldn't react in time
- Cross-chain users are the worst affected: they have collateral idle on one chain but their position is at risk on another

**Faraday closes that gap.** Your reserve lives on a single hub chain (ARC), earns yield while idle (USYC), and gets bridged to the right destination chain in under 500ms when a position needs rescuing.

---

## Why ARC

ARC is the only chain that makes this product viable:

| Requirement | ARC's solution |
|-------------|----------------|
| Need to react in **sub-second** to a liquidation event | ARC has sub-500ms finality |
| Agent needs gas without managing native tokens on every chain | USDC is ARC's native gas token (via Circle Paymaster) |
| Reserve must earn yield while idle, but be instantly redeemable | USYC integration is native — 5% APY, T-bill backed |
| Cross-chain transfer must be near-instant, not multi-minute bridge | Circle Gateway hits sub-500ms cross-chain settlement |
| Agent's permissions must be scoped — not custodial | Circle Wallets enforce scoped policies on-chain |

Take any of these away and Faraday isn't possible.

---

## Architecture

```
                       ARC NETWORK (hub)
   +---------------------------------------------------+
   |  PositionRegistry   FaradayVault                  |
   |  ----------------   --------------                |
   |  trigger/target     liquid USDC + USYC shares     |
   |  per user/chain     agent-only protection         |
   +---------------------------------------------------+
                              ^
                              | reads & writes
                              |
                       +-------------+
                       |    Agent    |  TypeScript, 30s poll
                       |  (Gemini)   |  scoped Circle Wallet
                       +-------------+
                       /      |     \
        reads HF      /       |      \      bridges USDC
                     v        v       v
              +---------+ +-------+ +---------+
              |  Aave   | | Venus | |  GMX    |
              |  Base   | |  BNB  | |   Arb   |
              +---------+ +-------+ +---------+
                  ^           ^         ^
                  |           |         |
              user opens position on any chain
```

The hub-and-spoke design is deliberate: the user **never** has to manage funds on multiple chains. They deposit USDC once on ARC, register which positions they care about, and the agent handles everything else.

---

## How It Works (end-to-end)

### 1. Register

User connects wallet → Faraday auto-detects their open positions across Aave V3 on Base/Ethereum/Arbitrum Sepolia → user picks one → sets `triggerHF` (e.g. 1.30) and `targetHF` (e.g. 1.50) → signs one transaction on ARC to `PositionRegistry.register(...)`.

### 2. Deposit Reserve

User sends USDC to the `FaradayVault`. The vault keeps the first 200 USDC as instant-access liquid buffer. Everything above 200 is automatically deposited into **USYC** (Circle's tokenized T-bill), earning ~5% APY while idle.

### 3. Monitor

The agent runs a 30-second polling loop:

- Reads all active positions from `PositionRegistry`
- For each one, calls `Aave.getUserAccountData(user)` on the source chain — returns `totalCollateralBase`, `totalDebtBase`, `liquidationThreshold`, and the live `healthFactor`
- If HF is within 20% of the user's `triggerHF`, escalates to the AI brain

### 4. Assess (the AI step)

`agent/src/brain/decide.ts` calls Gemini 2.5 Flash Lite with the full position state and a pre-computed USDC deficit:

```
requiredCollateral = debt × targetHF / liquidationThreshold
deficit            = requiredCollateral − currentCollateral
```

Gemini returns a JSON decision:

```json
{
  "shouldIntervene": true,
  "usdcAmount": 580000000,
  "reasoning": "HF 1.23 below trigger 1.30, bridge $580 to restore to target",
  "urgency": "immediate"
}
```

A deterministic fallback fires the same logic if Gemini errors. The AI's real value: classifying urgency, overriding the amount based on context (gas costs, multiple competing positions), and producing the human-readable reasoning shown in the UI.

### 5. Execute

If `shouldIntervene` is true, the agent calls `FaradayVault.executeProtection(user, amount, chainId, recipient)`:

1. Vault checks `liquidUsdc >= amount`. If not, it redeems just enough USYC shares via `IUSYCTeller.redeem(...)` to cover the shortfall
2. Vault approves the USDC to Circle Gateway
3. `Gateway.transfer(usdc, amount, destChain, recipient)` — sub-500ms cross-chain settlement
4. Funds land in the user's wallet on the source chain
5. User (or a follow-up agent action) can supply the USDC back to the lending protocol to restore HF

`logIntervention` is called on `PositionRegistry` for on-chain auditability.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Smart contracts | Solidity 0.8.24, Foundry |
| Agent | TypeScript, Node, viem, ethers |
| AI brain | Google Gemini 2.5 Flash Lite |
| Frontend | Next.js 15, React 19, Tailwind v4, wagmi, viem |
| 3D globe | Three.js + three-globe + topojson-client + world-atlas |
| Cross-chain | Circle Gateway, CCTP |
| Yield | USYC (Circle's tokenized US T-bills) |
| Gas | Circle Paymaster (USDC as gas) |
| Custody | Circle Wallets (scoped agent permissions) |
| Composability | MCP server (so other agents can call Faraday) |
| Hub chain | ARC testnet (chain ID 5042002) |
| Monitored chains | Base Sepolia, Ethereum Sepolia, Arbitrum Sepolia, BNB Testnet |

---

## Project Structure

```
Faraday/
├── contracts/           # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── FaradayVault.sol           # User reserve, USYC integration, agent-gated protection
│   │   ├── PositionRegistry.sol       # Registry of protected positions + intervention logs
│   │   ├── interfaces/                # IUSYC, IGateway, etc.
│   │   └── libraries/                 # SafeERC20
│   ├── script/                        # Foundry deployment scripts
│   └── test/                          # Foundry tests
│
├── agent/               # Autonomous monitoring agent (TypeScript, Node)
│   ├── src/
│   │   ├── index.ts                   # Main poll loop
│   │   ├── config.ts                  # RPC URLs, contract addresses
│   │   ├── monitor/
│   │   │   ├── healthFactor.ts        # Aave HF reader per chain
│   │   │   └── aaveDebt.ts            # Position debt breakdown
│   │   ├── brain/
│   │   │   └── decide.ts              # Gemini decision logic + deterministic fallback
│   │   ├── executor/
│   │   │   ├── protect.ts             # Calls vault.executeProtection
│   │   │   └── repayOnChain.ts        # Optional: auto-supply received USDC to Aave
│   │   └── integrations/              # Gateway, USYC, Circle Wallets clients
│
├── frontend/            # Next.js dashboard (Vision UI-styled)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Landing page + dashboard router
│   │   │   └── api/rpc/route.ts       # CORS proxy for ARC RPC
│   │   ├── components/
│   │   │   ├── Dashboard.tsx          # Main dashboard layout (sidebar + globe + grid)
│   │   │   ├── Sidebar.tsx            # Vision UI-style nav
│   │   │   ├── ParticleGlobe.tsx      # Three.js hex-dot globe with cross-chain arcs
│   │   │   ├── PositionsPanel.tsx     # Detected + protected positions
│   │   │   ├── ReservePanel.tsx       # Vault deposit/withdraw with USYC split
│   │   │   ├── RegisterPosition.tsx   # New position modal (auto-detects open Aave positions)
│   │   │   └── LandingPage.tsx        # Lightning + Cubes marketing page
│   │   ├── hooks/
│   │   │   ├── usePositions.ts        # Reads PositionRegistry
│   │   │   ├── useDetectPositions.ts  # Auto-scans Aave pools on all testnets
│   │   │   └── useArcNetwork.ts       # ARC chain switch logic
│   │   └── lib/wagmi.ts               # wagmi config with ARC chain
│   └── public/
│       ├── countries-110m.json        # World atlas data for the globe
│       └── countries-50m.json
│
├── mcp/                 # MCP server — exposes Faraday as a tool for other AI agents
│   └── src/
│
└── package.json         # Monorepo workspaces
```

---

## Deployed Contracts (ARC Testnet)

| Contract | Address |
|----------|---------|
| FaradayVault | `0xD12BEe576b9402eaB04ca8d9EB73691B72850A4E` |
| PositionRegistry | `0x1109ae5a33532A450487d1E1C1387bDE1DC35235` |
| USDC (ARC native) | `0x3600000000000000000000000000000000000000` |
| USYC | `0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C` |

ARC explorer: https://testnet.arcscan.app

---

## Running Locally

### Prerequisites

- Node 20+
- pnpm or npm
- Foundry (`curl -L https://foundry.paradigm.xyz | bash` then `foundryup`)
- A funded wallet on ARC testnet (USDC for gas, get from Canteen faucet)
- API keys: Alchemy (for testnet RPCs), Google Gemini, Circle (for Gateway)

### 1. Install

```bash
git clone https://github.com/minrawsjar/Faraday.git
cd Faraday
npm install
```

### 2. Configure agent

```bash
cp agent/.env.example agent/.env
```

Fill in `agent/.env`:

```
ARC_RPC_URL=https://rpc.testnet.arc-node.thecanteenapp.com/v1/<your-key>
ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<key>
ARB_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/<key>
BNB_RPC_URL=https://bsc-rpc.publicnode.com
BASE_RPC_URL=https://base-sepolia.g.alchemy.com/v2/<key>

CIRCLE_API_KEY=TEST_API_KEY:...
AGENT_PRIVATE_KEY=0x...                         # the agent's scoped Circle Wallet key

GEMINI_API_KEY=AIza...                          # Google AI Studio

FARADAY_VAULT_ADDRESS=0xD12BEe576b9402eaB04ca8d9EB73691B72850A4E
POSITION_REGISTRY_ADDRESS=0x1109ae5a33532A450487d1E1C1387bDE1DC35235

POLL_INTERVAL_MS=30000
```

### 3. Configure frontend

```bash
cp frontend/.env.local.example frontend/.env.local
```

```
ARC_RPC_URL=<server-side, used by /api/rpc proxy>
NEXT_PUBLIC_ARC_RPC_URL=/api/rpc
NEXT_PUBLIC_VAULT_ADDRESS=0xD12BEe576b9402eaB04ca8d9EB73691B72850A4E
NEXT_PUBLIC_REGISTRY_ADDRESS=0x1109ae5a33532A450487d1E1C1387bDE1DC35235
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_USYC_ADDRESS=0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C
```

### 4. Run

In three separate terminals:

```bash
# Terminal 1 — the agent
cd agent && npm run dev

# Terminal 2 — the frontend
cd frontend && npm run dev

# Terminal 3 — (optional) the MCP server, for AI-to-AI composability
cd mcp && npm run dev
```

Visit http://localhost:3000.

### 5. Smart contract development

```bash
cd contracts
forge build                  # compile
forge test                   # run tests
forge script script/Deploy.s.sol --rpc-url $ARC_RPC_URL --broadcast   # deploy
```

---

## Demo Flow

1. **Open an Aave position** on Base Sepolia (https://app.aave.com → switch to Base Sepolia → mint test USDC/USDT from the faucet → supply USDC → borrow USDT until HF ≈ 1.30)

2. **Connect to Faraday** at localhost:3000. The dashboard auto-detects your Aave position.

3. **Register protection** — click `+ Protect` on the detected position card. Set trigger 1.30, target 1.50. Sign on ARC.

4. **Deposit reserve** — switch to ARC testnet in your wallet. In the vault panel, deposit some USDC. First 200 stays liquid; rest auto-deploys into USYC. The split preview shows you exactly how it breaks down.

5. **Watch the agent** — leave the agent terminal running. Every 30 seconds it logs HF and decisions. As soon as you push the Aave position close to liquidation (borrow more, or wait for price drift), Gemini fires, the vault unwinds USYC if needed, Gateway bridges USDC, and your wallet on Base Sepolia receives the funds.

The whole rescue takes under 5 seconds end to end. The actual cross-chain hop is sub-500ms; the rest is RPC roundtrip + Gemini latency.

---

## MCP Server (composability bonus)

Faraday exposes itself as an MCP server (`mcp/`). Any other AI agent (Claude, ChatGPT, custom agents) can call:

- `register_position(...)` — protect a position on the user's behalf
- `get_position_status(id)` — read live HF + agent verdict
- `deposit_to_vault(amount)` — top up the reserve
- `simulate_protection(position)` — dry-run the full pipeline without executing

This means a portfolio-management agent can use Faraday as a sub-tool: *"my user's HF on Aave is at 1.15, call faraday.protect()."*

---

## Roadmap

- [x] Smart contracts: vault, registry, USYC integration, agent-gated protection
- [x] Agent: 30s poll loop, Aave HF reader, Gemini brain, vault execution
- [x] Frontend: Vision UI dashboard, particle globe, auto-detect positions, deposit/withdraw
- [x] MCP server scaffolding
- [ ] Venus integration (BNB Testnet)
- [ ] GMX V2 perp position support (Arbitrum Sepolia)
- [ ] Auto-supply: after USDC lands on source chain, have the agent supply it back to Aave automatically
- [ ] Mainnet deployment + USDC/USYC mainnet integration
- [ ] Insurance pool — share gas and liquidation-prevention risk across many users
- [ ] Mobile push notifications when HF hits trigger
- [ ] Multi-asset reserves (not just USDC)

---

## License

MIT

---

## Acknowledgments

- **Circle** — Gateway, CCTP, USYC, Paymaster, Wallets. The product is built on these primitives.
- **ARC** (Canteen) — for the sub-500ms hub chain
- **Aave**, **Venus**, **GMX** — the lending markets being monitored
- **Agora Hackathon** — for the prompt to build this
