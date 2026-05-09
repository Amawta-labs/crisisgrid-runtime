import { NextResponse } from "next/server";

import { buildVitacuraEarthquakeOrchestration } from "@/lib/agentic/orchestration";
import { scenarios } from "@/lib/crisis/scenarios";
import { toAgUiRuntimeEvents } from "@/lib/protocol/ag-ui-adapter";

export async function GET() {
  const scenario =
    scenarios.find((candidate) => candidate.id === "scenario_01_earthquake") ??
    scenarios[0];
  const plan = buildVitacuraEarthquakeOrchestration(scenario);

  return NextResponse.json({
    protocol: "ag-ui",
    package: "@ag-ui/core",
    endpoint: "/api/runtime/ag-ui",
    events: toAgUiRuntimeEvents(plan.events.map((scheduled) => scheduled.event)),
  });
}
