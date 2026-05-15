import { NextRequest, NextResponse } from "next/server";

const ARC_RPC = process.env.ARC_RPC_URL!;

export async function POST(req: NextRequest) {
  const body = await req.text();

  const response = await fetch(ARC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await response.text();
  return new NextResponse(data, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
