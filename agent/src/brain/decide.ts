import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import type { PositionHealth } from "../monitor/healthFactor.js";

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export interface Decision {
  shouldIntervene: boolean;
  usdcAmount: bigint;       // 6 decimals
  reasoning: string;
  urgency: "immediate" | "watch" | "safe";
}

const SYSTEM_PROMPT = `You are Faraday's risk engine. You assess DeFi lending positions and decide whether to intervene to prevent liquidation.

Rules:
- Health Factor (HF) < 1.0 means liquidation has already happened
- HF between 1.0-1.1 is critical — intervene immediately
- HF between 1.1 and triggerHF — intervene now
- HF above triggerHF but close — watch closely
- Always respond with ONLY a valid JSON object, no markdown, no explanation

Response schema:
{
  "shouldIntervene": boolean,
  "usdcAmount": number,
  "reasoning": "one sentence string",
  "urgency": "immediate" | "watch" | "safe"
}`;

export async function decide(position: PositionHealth): Promise<Decision> {
  const hf = Number(position.healthFactor) / 1e18;
  const trigger = Number(position.triggerHF) / 1e18;
  const target = Number(position.targetHF) / 1e18;
  const collateral = Number(position.totalCollateralBase) / 1e8;
  const debt = Number(position.totalDebtBase) / 1e8;
  const liqThreshold = Number(position.liquidationThreshold) / 10000;

  const requiredCollateral = debt * target / liqThreshold;
  const rawDeficit = Math.max(0, requiredCollateral - collateral);
  const deficitUsdc = Math.ceil(rawDeficit * 1e6);

  const prompt = `${SYSTEM_PROMPT}

Position data:
- Health Factor: ${hf.toFixed(4)} (trigger: ${trigger}, target: ${target})
- Total Collateral: $${collateral.toFixed(2)}
- Total Debt: $${debt.toFixed(2)}
- Liquidation Threshold: ${(liqThreshold * 100).toFixed(0)}%
- USDC needed to reach target HF: $${rawDeficit.toFixed(2)} (${deficitUsdc} raw 6-decimal units)
- Protocol: ${position.protocol}, Chain ID: ${position.chainId}

Respond with JSON only.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const json = text.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
    const parsed = JSON.parse(json);

    return {
      shouldIntervene: parsed.shouldIntervene ?? hf < trigger,
      usdcAmount: BigInt(parsed.usdcAmount ?? deficitUsdc),
      reasoning: parsed.reasoning ?? "HF below trigger threshold",
      urgency: parsed.urgency ?? "immediate",
    };
  } catch {
    // Deterministic fallback if Gemini call fails
    return {
      shouldIntervene: hf < trigger,
      usdcAmount: BigInt(deficitUsdc),
      reasoning: "Deterministic fallback: HF below trigger",
      urgency: hf < 1.1 ? "immediate" : "watch",
    };
  }
}
