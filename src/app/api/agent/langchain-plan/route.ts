import { NextResponse } from "next/server";

import { planCrisisSurface } from "@/lib/agentic/langchain-planner";
import { scenarios } from "@/lib/crisis/scenarios";

export async function GET() {
  const scenario =
    scenarios.find((candidate) => candidate.id === "scenario_01_earthquake") ??
    scenarios[0];
  const plannerDecision = await planCrisisSurface(scenario);

  return NextResponse.json({
    scenario,
    plannerDecision,
    langSmithTracingEnabled: Boolean(process.env.LANGSMITH_API_KEY),
  });
}
