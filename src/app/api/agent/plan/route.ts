import { NextResponse } from "next/server";
import { z } from "zod";

import { compileCrisisUiPlan } from "@/lib/crisis/runtime";
import { scenarios } from "@/lib/crisis/scenarios";
import type { RuntimeEvent } from "@/lib/runtime/events";

const requestSchema = z.object({
  scenarioId: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { scenarioId } = requestSchema.parse(body);
  const scenario =
    scenarios.find((candidate) => candidate.id === scenarioId) ?? scenarios[1];
  const uiPlan = compileCrisisUiPlan(scenario);

  return NextResponse.json({
    scenario,
    uiPlan,
    events: buildInitialEvents(uiPlan.generatedAt, scenario, uiPlan),
  });
}

export async function GET() {
  const scenario = scenarios[1];
  const uiPlan = compileCrisisUiPlan(scenario);

  return NextResponse.json({
    scenario,
    uiPlan,
    events: buildInitialEvents(uiPlan.generatedAt, scenario, uiPlan),
  });
}

function buildInitialEvents(
  timestamp: string,
  scenario: (typeof scenarios)[number],
  uiPlan: ReturnType<typeof compileCrisisUiPlan>,
): RuntimeEvent[] {
  return [
    ...scenario.signals.map(
      (signal): RuntimeEvent => ({
        id: crypto.randomUUID(),
        type: "signal.received",
        timestamp,
        agentId: signal.source === "camera" ? "camera_agent" : "orchestrator",
        signal,
      }),
    ),
    {
      id: crypto.randomUUID(),
      type: "agent.handoff",
      timestamp,
      agentId: "orchestrator",
      from: "camera_agent",
      to: "disaster_physics_agent",
      task: "Classify Chile-specific disaster physics from multimodal signals.",
      summary: `${scenario.name} classified as ${scenario.incidentType}.`,
      confidence: 0.82,
    },
    ...uiPlan.components.map(
      (component): RuntimeEvent => ({
        id: crypto.randomUUID(),
        type: "ui.component.added",
        timestamp,
        agentId: "ui_planner_agent",
        component,
      }),
    ),
    {
      id: crypto.randomUUID(),
      type: "gate.required",
      timestamp,
      agentId: "gatekeeper_agent",
      gateId: "public-alert-gate",
      title: "Approve external public advisory",
      risk: "Public alert may trigger movement; human approval required.",
      actionId: "publish-alert",
    },
  ];
}
