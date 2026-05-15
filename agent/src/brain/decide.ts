import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import type { PositionHealth } from "../monitor/healthFactor.js";

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

export interface Decision {
  shouldIntervene: boolean;
  usdcAmount: bigint;       // 6 decimals
  reasoning: string;
  urgency: "immediate" | "watch" | "safe";
}

const SYSTEM_PROMPT = `You are Faraday's risk engine. You assess DeFi lending positions and decide
whether to intervene to prevent liquidation.

Rules:
- Health Factor (HF) < 1.0 means liquidation has already happened
- HF between 1.0-1.1 is critical — intervene immediately
- HF between 1.1-triggerHF — intervene now
- HF above triggerHF but trending down fast — watch closely
- Always respond with valid JSON matching the DecisionSchema

DecisionSchema:
{
  "shouldIntervene": boolean,
  "usdcAmount": number,        // USDC with 6 decimals (e.g. 500000000 = 500 USDC)
  "reasoning": string,         // one sentence
  "urgency": "immediate" | "watch" | "safe"
}`;

export async function decide(position: PositionHealth): Promise<Decision> {
  const hf = Number(position.healthFactor) / 1e18;
  const trigger = Number(position.triggerHF) / 1e18;
  const target = Number(position.targetHF) / 1e18;
  const collateral = Number(position.totalCollateralBase) / 1e8;
  const debt = Number(position.totalDebtBase) / 1e8;
  const liqThreshold = Number(position.liquidationThreshold) / 10000;

  // Calculate raw deficit: how much USDC to reach targetHF
  const requiredCollateral = debt * target / liqThreshold;
  const rawDeficit = Math.max(0, requiredCollateral - collateral);
  const deficitUsdc = Math.ceil(rawDeficit * 1e6); // 6 decimals

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Position data:
- Health Factor: ${hf.toFixed(4)} (trigger: ${trigger}, target: ${target})
- Total Collateral: $${collateral.toFixed(2)}
- Total Debt: $${debt.toFixed(2)}
- Liquidation Threshold: ${(liqThreshold * 100).toFixed(0)}%
- Raw USDC needed to reach target HF: $${(rawDeficit).toFixed(2)}
- Protocol: ${position.protocol}, Chain: ${position.chainId}

Should Faraday intervene? If yes, how much USDC to send?`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";

  try {
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    return {
      shouldIntervene: parsed.shouldIntervene ?? hf < trigger,
      usdcAmount: BigInt(parsed.usdcAmount ?? deficitUsdc),
      reasoning: parsed.reasoning ?? "HF below trigger threshold",
      urgency: parsed.urgency ?? "immediate",
    };
  } catch {
    // Fallback to deterministic calculation if Claude response is malformed
    return {
      shouldIntervene: hf < trigger,
      usdcAmount: BigInt(deficitUsdc),
      reasoning: "Deterministic fallback: HF below trigger",
      urgency: hf < 1.1 ? "immediate" : "watch",
    };
  }
}
