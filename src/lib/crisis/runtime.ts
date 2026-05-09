import type { Scenario, Severity, UiPlan } from "./schemas";
import { uiPlanSchema } from "./schemas";

const severityByType: Record<Scenario["incidentType"], Severity> = {
  earthquake: "high",
  building_collapse: "critical",
  wildfire_evacuation: "critical",
  power_outage: "medium",
  tsunami: "critical",
  volcano: "high",
  mudflow: "high",
  storm_surge: "high",
};

const radiusByType: Record<Scenario["incidentType"], number> = {
  earthquake: 1600,
  building_collapse: 850,
  wildfire_evacuation: 2100,
  power_outage: 1200,
  tsunami: 3200,
  volcano: 4800,
  mudflow: 2600,
  storm_surge: 2200,
};

export function compileCrisisUiPlan(scenario: Scenario): UiPlan {
  const severity = severityByType[scenario.incidentType];
  const averageConfidence =
    scenario.signals.reduce((sum, signal) => sum + signal.confidence, 0) /
    scenario.signals.length;

  const contradictions = buildContradictions(scenario);
  const alertMessage = buildAlertMessage(scenario);

  const plan: UiPlan = {
    surface: "crisis_runtime",
    incidentType: scenario.incidentType,
    severity,
    generatedAt: new Date().toISOString(),
    components: [
      { type: "signal_inbox", props: { title: "Incoming signals" } },
      {
        type: "incident_card",
        props: {
          title: scenario.name,
          summary: scenario.summary,
          severity,
          confidence: Number(averageConfidence.toFixed(2)),
        },
      },
      {
        type: "generated_map_surface",
        props: {
          center: scenario.center,
          radiusMeters: radiusByType[scenario.incidentType],
          severity,
          label: scenario.name,
        },
      },
      {
        type: "contradiction_panel",
        props: { contradictions },
      },
      {
        type: "action_plan_board",
        props: {
          actions: [
            {
              id: "verify-access",
              title: "Verify safe access route",
              owner: "Mobility desk",
              status: "running",
            },
            {
              id: "stage-resources",
              title: "Stage nearest response unit",
              owner: "Ops lead",
              status: "needs_approval",
            },
            {
              id: "publish-alert",
              title: "Publish public advisory",
              owner: "Civic comms",
              status: "needs_approval",
            },
          ],
        },
      },
      {
        type: "public_alert_draft",
        props: {
          channel: "X / municipal alert",
          message: alertMessage,
        },
      },
      {
        type: "civic_gate",
        props: {
          title: "Approve external public advisory",
          risk:
            "May trigger public movement. Requires human approval before publishing.",
          actionId: "publish-alert",
          approvalLabel: "Approve advisory",
        },
      },
      {
        type: "agent_trace_timeline",
        props: {
          events: [
            {
              label: "Signals clustered",
              detail: `${scenario.signals.length} live inputs collapsed into one incident hypothesis.`,
            },
            {
              label: "Surface compiled",
              detail:
                "Map, contradictions, action board and approval gate selected from component catalog.",
            },
            {
              label: "Tool path proposed",
              detail:
                "External communication gated; route and resource actions can run internally.",
            },
          ],
        },
      },
    ],
    toolActions: [
      { id: "verify-access", label: "Route verification", status: "running" },
      { id: "stage-resources", label: "Resource staging", status: "pending" },
      { id: "publish-alert", label: "Public advisory", status: "pending" },
    ],
  };

  return uiPlanSchema.parse(plan);
}

function buildContradictions(scenario: Scenario) {
  if (scenario.incidentType === "building_collapse") {
    return [
      "Camera shows smoke but no verified structural collapse frame.",
      "Citizen report claims trapped people; count and exact location are unknown.",
      "Traffic confirms blocked access before responder confirmation arrives.",
    ];
  }

  if (scenario.incidentType === "wildfire_evacuation") {
    return [
      "Wind sensor indicates movement toward homes; camera distance estimate is unreliable.",
      "Shelter-in-place versus evacuation remains unresolved for school zone.",
      "North route is reported smoky but not yet physically blocked.",
    ];
  }

  return [
    "Seismic event is confirmed; visible damage remains unverified.",
    "Transit pause may be precautionary rather than damage-related.",
    "Crowd reports are high-volume but low precision.",
  ];
}

function buildAlertMessage(scenario: Scenario) {
  if (scenario.incidentType === "wildfire_evacuation") {
    return "Precautionary alert: avoid the Cerro Renca corridor and prepare for guided movement if instructed. Keep routes clear for responders.";
  }

  if (scenario.incidentType === "building_collapse") {
    return "Precautionary alert: avoid Los Leones / Suecia while responders verify smoke and access conditions. Do not approach the affected block.";
  }

  return "Precautionary alert: aftershock inspection is active in central Santiago. Avoid congested corridors and follow official route guidance.";
}
