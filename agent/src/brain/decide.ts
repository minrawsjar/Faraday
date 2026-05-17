import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import type { PositionHealth } from "../monitor/healthFactor.js";
import type { DebtToken } from "../monitor/aaveDebt.js";

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export interface Decision {
  shouldIntervene: boolean;
  usdcAmount: bigint;
  reasoning: string;
  urgency: "immediate" | "watch" | "safe";
  strategy: "direct_repay" | "vault_bridge";
  debtToken?: DebtToken; // set when strategy === "direct_repay"
}

const SYSTEM_PROMPT = `You are Faraday, an autonomous DeFi liquidation protection agent.

Your job: given a position's health factor and available liquidity sources, decide:
1. Whether to intervene
2. Which strategy to use — prefer the cheapest, fastest option first

Strategy options:
- "direct_repay": Agent has enough of the debt token on the destination chain already. Repay Aave debt directly. Fast, no bridging needed.
- "vault_bridge": Agent's on-chain balance is insufficient. Pull USDC from the ARC vault and bridge via Circle Gateway. Slower but always available.

Rules:
- HF < 1.0: already liquidated
- HF 1.0-1.1: critical, intervene immediately
- HF 1.1 to triggerHF: intervene now
- HF above triggerHF: watch, no action yet
- Always prefer "direct_repay" when agent has enough tokens on the destination chain
- Always respond with ONLY valid JSON, no markdown

Response schema:
{
  "shouldIntervene": boolean,
  "usdcAmount": number,
  "reasoning": "one clear sentence explaining the decision and chosen strategy",
  "urgency": "immediate" | "watch" | "safe",
  "strategy": "direct_repay" | "vault_bridge",
  "debtTokenAddress": "0x... or null"
}`;

export async function decide(
  position: PositionHealth,
  debtTokens: DebtToken[] = []
): Promise<Decision> {
  const hf       = Number(position.healthFactor) / 1e18;
  const trigger  = Number(position.triggerHF) / 1e18;
  const target   = Number(position.targetHF) / 1e18;
  const collateral   = Number(position.totalCollateralBase) / 1e8;
  const debt         = Number(position.totalDebtBase) / 1e8;
  const liqThreshold = Number(position.liquidationThreshold) / 10000;

  const requiredCollateral = debt * target / liqThreshold;
  const rawDeficit  = Math.max(0, requiredCollateral - collateral);
  const deficitUsdc = Math.ceil(rawDeficit * 1e6);

  // Summarise available debt token balances for Gemini
  const tokenSummary = debtTokens.length > 0
    ? debtTokens.map(t =>
        `  - ${t.symbol}: user owes $${t.totalDebtUsd.toFixed(2)}, agent has $${t.agentBalanceUsd.toFixed(2)} on dest chain, can direct repay: ${t.canDirectRepay}`
      ).join("\n")
    : "  - No debt token data available (fall back to vault_bridge)";

  const directRepayToken = debtTokens.find(t => t.canDirectRepay);

  const prompt = `${SYSTEM_PROMPT}

Position data:
- Health Factor: ${hf.toFixed(4)} (trigger: ${trigger}, target: ${target})
- Total Collateral: $${collateral.toFixed(2)}
- Total Debt: $${debt.toFixed(2)}
- Liquidation Threshold: ${(liqThreshold * 100).toFixed(0)}%
- USD needed to restore target HF: $${rawDeficit.toFixed(2)}
- Protocol: ${position.protocol}, Chain ID: ${position.chainId}

Agent liquidity on destination chain (${position.chainId}):
${tokenSummary}

ARC vault reserve available: yes (requires bridging via Circle Gateway)

Respond with JSON only.`;

  try {
    const result  = await model.generateContent(prompt);
    const text    = result.response.text();
    const cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
    const json    = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
    const parsed  = JSON.parse(json);
    console.log("[Gemini] decision:", JSON.stringify(parsed));

    const strategy: Decision["strategy"] =
      parsed.strategy === "direct_repay" && directRepayToken ? "direct_repay" : "vault_bridge";

    return {
      shouldIntervene: parsed.shouldIntervene ?? hf < trigger,
      usdcAmount:      BigInt(parsed.usdcAmount ?? deficitUsdc),
      reasoning:       parsed.reasoning ?? "HF below trigger threshold",
      urgency:         parsed.urgency   ?? "immediate",
      strategy,
      debtToken: strategy === "direct_repay" ? directRepayToken : undefined,
    };
  } catch {
    // Deterministic fallback
    const strategy: Decision["strategy"] = directRepayToken ? "direct_repay" : "vault_bridge";
    return {
      shouldIntervene: hf < trigger,
      usdcAmount:      BigInt(deficitUsdc),
      reasoning:       `Fallback: HF ${hf.toFixed(2)} below trigger ${trigger}. Strategy: ${strategy}.`,
      urgency:         hf < 1.1 ? "immediate" : "watch",
      strategy,
      debtToken: strategy === "direct_repay" ? directRepayToken : undefined,
    };
  }
}
