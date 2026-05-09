import { z } from "zod";

export const signalSourceSchema = z.enum([
  "camera",
  "radio",
  "citizen",
  "traffic",
  "sensor",
  "social",
]);

export const severitySchema = z.enum(["low", "medium", "high", "critical"]);

export const incidentTypeSchema = z.enum([
  "earthquake",
  "building_collapse",
  "wildfire_evacuation",
  "power_outage",
  "tsunami",
  "volcano",
  "mudflow",
  "storm_surge",
]);

export const signalSchema = z.object({
  id: z.string(),
  source: signalSourceSchema,
  text: z.string(),
  confidence: z.number().min(0).max(1),
  location: z.string(),
  receivedAt: z.string(),
});

export const scenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  incidentType: incidentTypeSchema,
  summary: z.string(),
  center: z.tuple([z.number(), z.number()]),
  signals: z.array(signalSchema),
});

export const uiComponentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("signal_inbox"),
    props: z.object({ title: z.string() }),
  }),
  z.object({
    type: z.literal("incident_card"),
    props: z.object({
      title: z.string(),
      summary: z.string(),
      severity: severitySchema,
      confidence: z.number().min(0).max(1),
    }),
  }),
  z.object({
    type: z.literal("generated_map_surface"),
    props: z.object({
      center: z.tuple([z.number(), z.number()]),
      radiusMeters: z.number(),
      severity: severitySchema,
      label: z.string(),
    }),
  }),
  z.object({
    type: z.literal("risk_zone_layer"),
    props: z.object({
      center: z.tuple([z.number(), z.number()]),
      radiusMeters: z.number(),
      severity: severitySchema,
      reason: z.string(),
    }),
  }),
  z.object({
    type: z.literal("resource_deployment_panel"),
    props: z.object({
      resources: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          status: z.enum(["available", "staging", "deployed", "blocked"]),
        }),
      ),
    }),
  }),
  z.object({
    type: z.literal("route_planner_panel"),
    props: z.object({
      routes: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          status: z.enum(["open", "restricted", "blocked", "unknown"]),
          etaMinutes: z.number().optional(),
        }),
      ),
    }),
  }),
  z.object({
    type: z.literal("contradiction_panel"),
    props: z.object({
      contradictions: z.array(z.string()),
    }),
  }),
  z.object({
    type: z.literal("action_plan_board"),
    props: z.object({
      actions: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          owner: z.string(),
          status: z.enum(["queued", "needs_approval", "running", "done"]),
        }),
      ),
    }),
  }),
  z.object({
    type: z.literal("public_alert_draft"),
    props: z.object({
      channel: z.string(),
      message: z.string(),
    }),
  }),
  z.object({
    type: z.literal("public_broadcast_panel"),
    props: z.object({
      channel: z.literal("x_twitter"),
      audience: z.string(),
      handle: z.string(),
      message: z.string(),
      autonomy: z.enum(["draft_only", "autonomous_after_approval"]),
      actionId: z.string(),
      approvalLabel: z.string(),
    }),
  }),
  z.object({
    type: z.literal("civic_gate"),
    props: z.object({
      title: z.string(),
      risk: z.string(),
      actionId: z.string(),
      approvalLabel: z.string(),
    }),
  }),
  z.object({
    type: z.literal("agent_trace_timeline"),
    props: z.object({
      events: z.array(
        z.object({
          label: z.string(),
          detail: z.string(),
        }),
      ),
    }),
  }),
  z.object({
    type: z.literal("tool_creation_panel"),
    props: z.object({
      tools: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          runtime: z.enum(["daytona", "local", "mcp"]),
          status: z.enum(["proposed", "running", "completed", "failed"]),
        }),
      ),
    }),
  }),
]);

export const toolActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["pending", "running", "done", "failed", "requires_approval"]),
});

export const uiPlanSchema = z.object({
  surface: z.literal("crisis_runtime"),
  incidentType: incidentTypeSchema,
  severity: severitySchema,
  generatedAt: z.string(),
  components: z.array(uiComponentSchema),
  toolActions: z.array(toolActionSchema),
});

export type Signal = z.infer<typeof signalSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type Severity = z.infer<typeof severitySchema>;
export type UiComponent = z.infer<typeof uiComponentSchema>;
export type UiPlan = z.infer<typeof uiPlanSchema>;
