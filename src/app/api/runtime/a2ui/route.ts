import { NextResponse } from "next/server";

import { buildVitacuraEarthquakeOrchestration } from "@/lib/agentic/orchestration";
import { scenarios } from "@/lib/crisis/scenarios";
import { toA2UIMessages } from "@/lib/protocol/a2ui-adapter";

export async function GET() {
  const scenario =
    scenarios.find((candidate) => candidate.id === "scenario_01_earthquake") ??
    scenarios[0];
  const plan = buildVitacuraEarthquakeOrchestration(scenario);
  const components = plan.events.flatMap((scheduled) =>
    scheduled.event.type === "ui.component.added" ? [scheduled.event.component] : [],
  );

  return NextResponse.json({
    protocol: "a2ui",
    version: "v0.9",
    package: "@a2ui/web_core",
    endpoint: "/api/runtime/a2ui",
    messages: toA2UIMessages(components, plan.events.length),
  });
}
