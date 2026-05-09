import { z } from "zod";

import {
  severitySchema,
  signalSchema,
  uiComponentSchema,
} from "@/lib/crisis/schemas";

export const agentIdSchema = z.enum([
  "orchestrator",
  "camera_agent",
  "social_agent",
  "public_api_sensor_agent",
  "disaster_physics_agent",
  "ui_planner_agent",
  "gatekeeper_agent",
  "tool_execution_agent",
  "daytona_tool_agent",
]);

const eventBaseSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  agentId: agentIdSchema,
});

export const mapLayerSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(["risk_zone", "route", "resource", "camera", "sensor"]),
  severity: severitySchema.optional(),
  data: z.record(z.unknown()),
});

export const uiComponentTypeSchema = z.enum([
  "signal_inbox",
  "incident_card",
  "generated_map_surface",
  "risk_zone_layer",
  "resource_deployment_panel",
  "route_planner_panel",
  "contradiction_panel",
  "action_plan_board",
  "public_alert_draft",
  "public_broadcast_panel",
  "civic_gate",
  "agent_trace_timeline",
  "tool_creation_panel",
]);

export const runtimeEventSchema = z.discriminatedUnion("type", [
  eventBaseSchema.extend({
    type: z.literal("signal.received"),
    signal: signalSchema,
  }),
  eventBaseSchema.extend({
    type: z.literal("agent.handoff"),
    from: agentIdSchema,
    to: agentIdSchema,
    task: z.string(),
    summary: z.string(),
    confidence: z.number().min(0).max(1),
  }),
  eventBaseSchema.extend({
    type: z.literal("ui.component.added"),
    component: uiComponentSchema,
  }),
  eventBaseSchema.extend({
    type: z.literal("ui.component.updated"),
    componentType: uiComponentTypeSchema,
    patch: z.record(z.unknown()),
  }),
  eventBaseSchema.extend({
    type: z.literal("map.layer.added"),
    layer: mapLayerSchema,
  }),
  eventBaseSchema.extend({
    type: z.literal("tool.started"),
    toolId: z.string(),
    toolName: z.enum([
      "simulate_disaster_physics",
      "compile_operational_plan",
      "generate_public_alert_packet",
      "publish_public_alert_mock",
      "navigate_map_to_target",
    ]),
    runtime: z.enum(["daytona", "local", "mcp"]),
    input: z.record(z.unknown()),
  }),
  eventBaseSchema.extend({
    type: z.literal("tool.completed"),
    toolId: z.string(),
    runtime: z.enum(["daytona", "local", "mcp"]),
    output: z.record(z.unknown()),
    generatedComponents: z.array(uiComponentSchema).default([]),
    generatedLayers: z.array(mapLayerSchema).default([]),
  }),
  eventBaseSchema.extend({
    type: z.literal("gate.required"),
    gateId: z.string(),
    title: z.string(),
    risk: z.string(),
    actionId: z.string(),
  }),
  eventBaseSchema.extend({
    type: z.literal("gate.approved"),
    gateId: z.string(),
    actionId: z.string(),
    approvedBy: z.string(),
  }),
]);

export type AgentId = z.infer<typeof agentIdSchema>;
export type MapLayer = z.infer<typeof mapLayerSchema>;
export type RuntimeEvent = z.infer<typeof runtimeEventSchema>;

export function parseRuntimeEvent(event: unknown): RuntimeEvent {
  return runtimeEventSchema.parse(event);
}
