import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { traceable } from "langsmith/traceable";
import { z } from "zod";

import type { Scenario } from "@/lib/crisis/schemas";
import { componentBankPrompt } from "@/lib/ui-registry/component-bank";

export const agentPlannerDecisionSchema = z.object({
  incidentClass: z.enum([
    "earthquake",
    "building_collapse",
    "wildfire_evacuation",
    "power_outage",
    "tsunami",
    "volcano",
    "mudflow",
    "storm_surge",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  operatorBrief: z.string(),
  visualVerificationNeeded: z.boolean(),
  evidenceNeeded: z.array(z.string()),
  handoffs: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      task: z.string(),
      summary: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  recommendedTool: z.enum([
    "simulate_disaster_physics",
    "compile_operational_plan",
    "generate_public_alert_packet",
  ]),
  componentsToRender: z.array(
    z.enum([
      "signal_inbox",
      "incident_card",
      "generated_map_surface",
      "risk_zone_layer",
      "resource_deployment_panel",
      "route_planner_panel",
      "contradiction_panel",
      "action_plan_board",
      "public_alert_draft",
      "civic_gate",
      "emergency_dispatch_panel",
      "agent_trace_timeline",
      "tool_creation_panel",
    ]),
  ),
  publicDecisionRisk: z.string(),
});

export type AgentPlannerDecision = z.infer<typeof agentPlannerDecisionSchema>;

export const planCrisisSurface = traceable(
  async (scenario: Scenario): Promise<AgentPlannerDecision> => {
    if (!process.env.GOOGLE_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return fallbackPlannerDecision(scenario);
    }

    try {
      const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0.15,
        maxOutputTokens: 1200,
        apiKey: process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      const response = await model.invoke([
        new SystemMessage(buildSystemPrompt()),
        new HumanMessage(JSON.stringify({ scenario }, null, 2)),
      ]);
      const decision = parsePlannerJson(messageContentToText(response.content));

      return agentPlannerDecisionSchema.parse(decision);
    } catch (error) {
      return {
        ...fallbackPlannerDecision(scenario),
        operatorBrief: `Gemini planner fallback: ${
          error instanceof Error ? error.message : "unknown planner error"
        }`,
      };
    }
  },
  {
    name: "CrisisGrid LangChain UI Planner",
    run_type: "chain",
    project_name: process.env.LANGSMITH_PROJECT ?? "crisisgrid-runtime",
    tracingEnabled: Boolean(process.env.LANGSMITH_API_KEY),
  },
);

function buildSystemPrompt() {
  return `You are CrisisGrid's UI Planner Agent.

Your job is not to write chat responses. Your job is to choose which prebuilt operational UI components should appear, in what order, and which agent/tool should act next.

Use only this component bank:
${componentBankPrompt()}

Rules:
- CrisisGrid is a Chile-focused disaster runtime.
- Cameras are not the primary source of truth. They are the human visual verification layer between institutional signals and public decisions.
- Prefer visual verification before any public alert or evacuation instruction.
- Recommend Daytona tools when simulation, operational planning or alert packaging should produce artifacts.
- Keep the output compact and operational.
- Return JSON only. Do not wrap it in markdown.

Required JSON shape:
{
  "incidentClass": "earthquake",
  "severity": "low | medium | high | critical",
  "operatorBrief": "short operational briefing",
  "visualVerificationNeeded": true,
  "evidenceNeeded": ["nearby cameras"],
  "handoffs": [
    {
      "from": "orchestrator",
      "to": "camera_agent",
      "task": "task",
      "summary": "summary",
      "confidence": 0.85
    }
  ],
  "recommendedTool": "simulate_disaster_physics",
  "componentsToRender": ["signal_inbox", "incident_card"],
  "publicDecisionRisk": "why HITL is required"
}`;
}

function messageContentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }
        return "";
      })
      .join("");
  }

  return "";
}

function parsePlannerJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini planner did not return a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function fallbackPlannerDecision(scenario: Scenario): AgentPlannerDecision {
  return {
    incidentClass: scenario.incidentType,
    severity: scenario.incidentType === "wildfire_evacuation" ? "critical" : "high",
    operatorBrief:
      "Relevant event detected. Pull nearby cameras before public escalation and compile an operational surface.",
    visualVerificationNeeded: true,
    evidenceNeeded: [
      "Nearby camera feeds",
      "Traffic disruption",
      "Contradictory social reports",
    ],
    handoffs: [
      {
        from: "orchestrator",
        to: "camera_agent",
        task: "Pull nearby visual feeds for human verification.",
        summary: "Visual evidence is required before public guidance.",
        confidence: 0.9,
      },
      {
        from: "camera_agent",
        to: "disaster_physics_agent",
        task: "Classify disaster physics using sensor and camera evidence.",
        summary: "Camera feeds reduce uncertainty but do not replace sensors.",
        confidence: 0.82,
      },
      {
        from: "disaster_physics_agent",
        to: "ui_planner_agent",
        task: "Compile the incident-specific operational UI.",
        summary: "Render map, camera verification, action plan and approval gate.",
        confidence: 0.86,
      },
    ],
    recommendedTool: "simulate_disaster_physics",
    componentsToRender: [
      "signal_inbox",
      "incident_card",
      "generated_map_surface",
      "tool_creation_panel",
      "action_plan_board",
      "civic_gate",
    ],
    publicDecisionRisk:
      "Public guidance may cause movement; require operator approval after visual verification.",
  };
}
