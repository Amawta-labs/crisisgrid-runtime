import type { Scenario, UiComponent } from "@/lib/crisis/schemas";
import type { AgentPlannerDecision } from "@/lib/agentic/langchain-planner";
import type { AgentId, RuntimeEvent } from "@/lib/runtime/events";
import {
  getAllMockSourceSnapshots,
  type SourceSnapshot,
} from "@/lib/sources/mock-source-adapters";

export type ScheduledRuntimeEvent = {
  delayMs: number;
  actionDelayMs?: number;
  event: RuntimeEvent;
};

export type OrchestrationPlan = {
  scenario: Scenario;
  plannerDecision?: AgentPlannerDecision;
  events: ScheduledRuntimeEvent[];
};

export function buildVitacuraEarthquakeOrchestration(
  scenario: Scenario,
  plannerDecision?: AgentPlannerDecision,
  sourceSnapshots: SourceSnapshot[] = getAllMockSourceSnapshots(scenario),
): OrchestrationPlan {
  const timestamp = new Date().toISOString();
  const sourceObservations = sourceSnapshots.flatMap((snapshot) => snapshot.observations);
  const publicApiObservations = sourceObservations.filter(
    (observation) => observation.agentId === "public_api_sensor_agent",
  );
  const cameraObservations = sourceObservations.filter(
    (observation) => observation.agentId === "camera_agent",
  );
  const socialObservations = sourceObservations.filter(
    (observation) => observation.agentId === "social_agent",
  );
  const cameraSignals = cameraObservations.map((observation) => observation.signal);
  const firstCameraObservations = cameraObservations.slice(0, 3);
  const followUpCameraObservations = cameraObservations.slice(3);
  const firstSocialObservations = socialObservations.slice(0, 1);
  const followUpSocialObservations = socialObservations.slice(1);
  const primaryHardSignal = publicApiObservations[0]?.signal ?? scenario.signals[0];
  const visualSummary =
    cameraObservations[0]?.operationalImplication ??
    "Nearest camera feeds requested as human visual verification layer.";
  const socialSummary =
    socialObservations[0]?.operationalImplication ??
    "Social reports are treated as contradiction signals, not direct escalation.";
  const sourceNames = sourceSnapshots.map((snapshot) => snapshot.label).join(", ");

  const incidentCard: UiComponent = {
    type: "incident_card",
    props: {
      title: "Sismo relevante: corredor Vitacura-Costanera",
      summary:
        plannerDecision?.operatorBrief ??
        `${primaryHardSignal.text} CrisisGrid is pulling nearby camera feeds before escalating public guidance.`,
      severity: plannerDecision?.severity ?? "high",
      confidence: 0.84,
    },
  };
  const mapSurface: UiComponent = {
    type: "generated_map_surface",
    props: {
      center: [-70.5707, -33.3972],
      radiusMeters: 1800,
      severity: "high",
      label: "Vitacura visual verification envelope",
    },
  };
  const contradictionPanel: UiComponent = {
    type: "contradiction_panel",
    props: {
      contradictions: [
        "Sensor event is reliable, but visible damage is not confirmed.",
        "Traffic slowdown may be inspection behavior rather than structural blockage.",
        "Social reports mention pavement cracks without official confirmation.",
      ],
    },
  };
  const toolPanel: UiComponent = {
    type: "tool_creation_panel",
    props: {
      tools: [
        {
          id: "simulate-disaster-physics",
          label: "Simulate seismic impact envelope in Daytona",
          runtime: "daytona",
          status: "proposed",
        },
      ],
    },
  };
  const traceTimeline: UiComponent = {
    type: "agent_trace_timeline",
    props: {
      events: [
        {
          label: "public_api_sensor_agent -> orchestrator",
          detail: `${sourceNames} normalized into a hard-evidence packet.`,
        },
        {
          label: "orchestrator -> disaster_physics_agent",
          detail: "Earthquake model selected before the interface is compiled.",
        },
        {
          label: "disaster_physics_agent -> camera_agent",
          detail:
            plannerDecision?.handoffs[0]?.summary ??
            visualSummary,
        },
        {
          label: "camera_agent -> social_agent",
          detail: socialSummary,
        },
        {
          label: "ui_planner_agent -> tool_execution_agent",
          detail: "Risk envelope delegated to isolated sandbox execution.",
        },
      ],
    },
  };
  const civicGate: UiComponent = {
    type: "civic_gate",
    props: {
      title: "Approve public advisory after visual verification",
      risk: "Public alert may trigger movement. Cameras show congestion, but no visible collapse.",
      actionId: "publish-alert",
      approvalLabel: "Approve advisory",
    },
  };
  const publicBroadcastPanel: UiComponent = {
    type: "public_broadcast_panel",
    props: {
      channel: "x_twitter",
      audience: "Región Metropolitana",
      handle: "@CrisisGridCL",
      message:
        "Sismo percibido en la Región Metropolitana. Evita el corredor Vitacura-Costanera mientras equipos verifican condiciones. Mantén rutas despejadas y sigue canales oficiales.",
      autonomy: "autonomous_after_approval",
      actionId: "publish-x-rm-alert",
      approvalLabel: "Authorize X post",
    },
  };
  const emergencyDispatchPanel: UiComponent = {
    type: "emergency_dispatch_panel",
    props: {
      service: "Bomberos",
      reason:
        "Camera and sensor evidence indicate debris and blocked access near the Vitacura-Costanera corridor; request staged response verification only.",
      location: "Vitacura-Costanera corridor, Región Metropolitana",
      priority: "high",
      actionId: "dispatch-bomberos-vitacura-mock",
      approvalLabel: "Authorize mock contact",
    },
  };

  return {
    scenario,
    plannerDecision,
    events: [
      ...publicApiObservations.map((observation, index) =>
        scheduled(350 + index * 260, {
          id: `evt-${observation.id}`,
          type: "signal.received",
          timestamp,
          agentId: observation.agentId,
          signal: observation.signal,
        }),
      ),
      scheduled(900, {
        id: "evt-public-api-handoff",
        type: "agent.handoff",
        timestamp,
        agentId: "public_api_sensor_agent",
        from: "public_api_sensor_agent",
        to: "orchestrator",
        task: "Merge CSN, SHOA, CONAF/NASA and Open-Meteo evidence into shared incident state.",
        summary:
          publicApiObservations
            .map((observation) => observation.operationalImplication)
            .join(" "),
        confidence: 0.86,
      }),
      scheduled(1180, {
        id: "evt-risk-handoff",
        type: "agent.handoff",
        timestamp,
        agentId: "orchestrator",
        from: "orchestrator",
        to: "disaster_physics_agent",
        task: "Classify disaster physics and decide which operational model applies.",
        summary:
          "Orchestrator routes the hard-signal packet into earthquake risk interpretation.",
        confidence: 0.88,
      }),
      scheduled(1460, {
        id: "evt-camera-handoff",
        type: "agent.handoff",
        timestamp,
        agentId: "disaster_physics_agent",
        from: toAgentId(plannerDecision?.handoffs[0]?.from, "disaster_physics_agent"),
        to: toAgentId(plannerDecision?.handoffs[0]?.to, "camera_agent"),
        task:
          plannerDecision?.handoffs[0]?.task ??
          "Pull cameras closest to the seismic envelope before public escalation.",
        summary:
          plannerDecision?.handoffs[0]?.summary ??
          "Operator needs visual evidence before approving any public alert.",
        confidence: plannerDecision?.handoffs[0]?.confidence ?? 0.9,
      }),
      ...firstCameraObservations.map((observation, index) =>
        scheduled(1900 + index * 520, {
          id: `evt-${observation.id}`,
          type: "signal.received",
          timestamp,
          agentId: observation.agentId,
          signal: observation.signal,
        }),
      ),
      scheduled(3200, {
        id: "evt-social-handoff",
        type: "agent.handoff",
        timestamp,
        agentId: "camera_agent",
        from: "camera_agent",
        to: "social_agent",
        task: "Contrast camera evidence against citizen/social reports.",
        summary:
          visualSummary,
        confidence: 0.76,
      }),
      ...firstSocialObservations.map((observation, index) =>
        scheduled(3800 + index * 420, {
          id: `evt-${observation.id}`,
          type: "signal.received",
          timestamp,
          agentId: observation.agentId,
          signal: observation.signal,
        }),
      ),
      scheduled(4550, {
        id: "evt-physics-handoff",
        type: "agent.handoff",
        timestamp,
        agentId: "social_agent",
        from: "social_agent",
        to: "disaster_physics_agent",
        task: "Classify seismic risk using sensor, traffic, camera and social signals.",
        summary:
          "Relevant earthquake; operational risk is congestion and inspection, not confirmed collapse.",
        confidence: 0.84,
      }),
      scheduled(4920, {
        id: "evt-ui-planner-handoff",
        type: "agent.handoff",
        timestamp,
        agentId: "disaster_physics_agent",
        from: "disaster_physics_agent",
        to: "ui_planner_agent",
        task: "Compile a generated interface from evidence, contradictions and map target.",
        summary:
          "UI Planner receives incident class, visual verification needs and public-decision risk.",
        confidence: 0.87,
      }),
      scheduled(5400, {
        id: "evt-incident-card",
        type: "ui.component.added",
        timestamp,
        agentId: "ui_planner_agent",
        component: incidentCard,
      }),
      scheduled(6400, {
        id: "evt-map-surface",
        type: "ui.component.added",
        timestamp,
        agentId: "ui_planner_agent",
        component: mapSurface,
      }),
      scheduled(7350, {
        id: "evt-contradiction-panel",
        type: "ui.component.added",
        timestamp,
        agentId: "ui_planner_agent",
        component: contradictionPanel,
      }),
      scheduled(8100, {
        id: "evt-map-layer",
        type: "map.layer.added",
        timestamp,
        agentId: "disaster_physics_agent",
        layer: {
          id: "vitacura-visual-verification",
          label: "Visual verification radius",
          kind: "risk_zone",
          severity: "high",
          data: {
            center: [-70.5707, -33.3972],
            radiusMeters: 1800,
          },
        },
      }),
      scheduled(9200, {
        id: "evt-tool-panel",
        type: "ui.component.added",
        timestamp,
        agentId: "ui_planner_agent",
        component: toolPanel,
      }),
      scheduled(10300, {
        id: "evt-agent-trace-timeline",
        type: "ui.component.added",
        timestamp,
        agentId: "ui_planner_agent",
        component: traceTimeline,
      }),
      scheduled(11200, {
        id: "evt-daytona-start",
        type: "tool.started",
        timestamp,
        agentId: "tool_execution_agent",
        toolId: "simulate-disaster-physics",
        toolName: "simulate_disaster_physics",
        runtime: "daytona",
        input: {
          incidentType: "earthquake",
          location: "Vitacura",
          sourceAdapters: sourceSnapshots.map((snapshot) => snapshot.adapter),
          visualEvidence: cameraSignals.map((signal) => signal.location),
        },
      }),
      scheduled(13000, {
        id: "evt-gate-required",
        type: "gate.required",
        timestamp,
        agentId: "gatekeeper_agent",
        gateId: "public-alert-gate",
        title: "Approve public advisory after visual check",
        risk:
          plannerDecision?.publicDecisionRisk ??
          "Cameras reduce uncertainty, but public movement still requires human confirmation.",
        actionId: "publish-alert",
      }),
      scheduled(13700, {
        id: "evt-civic-gate",
        type: "ui.component.added",
        timestamp,
        agentId: "gatekeeper_agent",
        component: civicGate,
      }),
      scheduled(14500, {
        id: "evt-public-broadcast-panel",
        type: "ui.component.added",
        timestamp,
        agentId: "gatekeeper_agent",
        component: publicBroadcastPanel,
      }),
      scheduled(15500, {
        id: "evt-emergency-dispatch-required",
        type: "gate.required",
        timestamp,
        agentId: "gatekeeper_agent",
        gateId: "emergency-dispatch-gate",
        title: "Authorize mock emergency-service contact",
        risk:
          "Contacting or dispatching emergency services is operationally sensitive and requires explicit human approval. Demo mode only.",
        actionId: emergencyDispatchPanel.props.actionId,
      }),
      scheduled(16200, {
        id: "evt-emergency-dispatch-panel",
        type: "ui.component.added",
        timestamp,
        agentId: "gatekeeper_agent",
        component: emergencyDispatchPanel,
      }),
      afterApproval(600, {
        id: "evt-followup-camera-handoff",
        type: "agent.handoff",
        timestamp,
        agentId: "gatekeeper_agent",
        from: "gatekeeper_agent",
        to: "camera_agent",
        task: "Continue monitoring after operator approval and look for worsening visual evidence.",
        summary: "Operator approval keeps the system live; camera agent continues visual checks.",
        confidence: 0.82,
      }),
      ...followUpCameraObservations.map((observation, index) =>
        afterApproval(1200 + index * 620, {
          id: `evt-followup-${observation.id}`,
          type: "signal.received",
          timestamp,
          agentId: observation.agentId,
          signal: observation.signal,
        }),
      ),
      ...followUpSocialObservations.map((observation, index) =>
        afterApproval(1800 + index * 620, {
          id: `evt-followup-${observation.id}`,
          type: "signal.received",
          timestamp,
          agentId: observation.agentId,
          signal: observation.signal,
        }),
      ),
      afterApproval(2600, {
        id: "evt-followup-ui-update",
        type: "ui.component.updated",
        timestamp,
        agentId: "ui_planner_agent",
        componentType: "contradiction_panel",
        patch: {
          contradictions: [
            "After operator approval, new camera report shows glass/debris near access lanes.",
            "Traffic obstruction is now plausible, but structural collapse is still not confirmed.",
            "Public advisory should remain precautionary until field inspection arrives.",
          ],
        },
      }),
      afterApproval(3200, {
        id: "evt-operational-plan-start",
        type: "tool.started",
        timestamp,
        agentId: "tool_execution_agent",
        toolId: "compile-operational-plan",
        toolName: "compile_operational_plan",
        runtime: "daytona",
        input: {
          incidentType: "earthquake",
          location: "Vitacura",
          sourceAdapters: sourceSnapshots.map((snapshot) => snapshot.adapter),
          postApproval: true,
        },
      }),
    ],
  };
}

function scheduled(delayMs: number, event: RuntimeEvent): ScheduledRuntimeEvent {
  return { delayMs, event };
}

function afterApproval(actionDelayMs: number, event: RuntimeEvent): ScheduledRuntimeEvent {
  return {
    delayMs: 0,
    actionDelayMs,
    event,
  };
}

function toAgentId(value: string | undefined, fallback: AgentId): AgentId {
  const allowed: AgentId[] = [
    "orchestrator",
    "camera_agent",
    "social_agent",
    "public_api_sensor_agent",
    "disaster_physics_agent",
    "ui_planner_agent",
    "gatekeeper_agent",
    "tool_execution_agent",
    "daytona_tool_agent",
  ];

  return allowed.includes(value as AgentId) ? (value as AgentId) : fallback;
}
