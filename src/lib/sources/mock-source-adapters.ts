import type { AgentId } from "@/lib/runtime/events";
import type { Scenario, Signal } from "@/lib/crisis/schemas";

export const sourceAdapterIds = [
  "csn",
  "shoa-dmc",
  "conaf-nasa",
  "open-meteo",
  "live-cameras",
  "social-listening",
] as const;

export type SourceAdapterId = (typeof sourceAdapterIds)[number];

export type SourceObservation = {
  id: string;
  sourceAdapter: SourceAdapterId;
  agentId: AgentId;
  signal: Signal;
  operationalImplication: string;
  uiHint:
    | "map_focus"
    | "camera_verification"
    | "contradiction"
    | "risk_model"
    | "public_gate";
};

export type SourceSnapshot = {
  adapter: SourceAdapterId;
  label: string;
  partnerSurface: "mock_adapter" | "daytona_tool_input" | "ag_ui_event_source";
  scenarioId: string;
  collectedAt: string;
  observations: SourceObservation[];
};

export function getMockSourceSnapshot(
  adapter: SourceAdapterId,
  scenario: Pick<Scenario, "id" | "incidentType" | "center">,
): SourceSnapshot {
  const collectedAt = new Date().toISOString();
  const observations = buildObservations(adapter, scenario);

  return {
    adapter,
    label: adapterLabels[adapter],
    partnerSurface: adapter === "live-cameras" ? "ag_ui_event_source" : "mock_adapter",
    scenarioId: scenario.id,
    collectedAt,
    observations,
  };
}

export function getAllMockSourceSnapshots(
  scenario: Pick<Scenario, "id" | "incidentType" | "center">,
) {
  return sourceAdapterIds.map((adapter) => getMockSourceSnapshot(adapter, scenario));
}

export function isSourceAdapterId(value: string): value is SourceAdapterId {
  return sourceAdapterIds.includes(value as SourceAdapterId);
}

function buildObservations(
  adapter: SourceAdapterId,
  scenario: Pick<Scenario, "id" | "incidentType" | "center">,
): SourceObservation[] {
  if (scenario.incidentType === "wildfire_evacuation") {
    return wildfireObservations(adapter);
  }

  return earthquakeObservations(adapter);
}

function earthquakeObservations(adapter: SourceAdapterId): SourceObservation[] {
  const receivedAt = "14:27";

  switch (adapter) {
    case "csn":
      return [
        observation(adapter, "public_api_sensor_agent", {
          id: "csn-vitacura-001",
          source: "sensor",
          text: "CSN-style feed: M5.7 shallow seismic event, perceived strongly across Santiago Oriente.",
          confidence: 0.89,
          location: "Vitacura / Santiago Oriente",
          receivedAt,
        }, "Hard seismic signal starts the operational runtime.", "map_focus"),
      ];
    case "shoa-dmc":
      return [
        observation(adapter, "public_api_sensor_agent", {
          id: "shoa-dmc-001",
          source: "sensor",
          text: "SHOA/DMC-style coastal check: no tsunami threshold for central coast; DMC reports stable weather.",
          confidence: 0.81,
          location: "Valparaiso / central coast",
          receivedAt,
        }, "Tsunami surface is not needed; keep coastal monitoring passive.", "risk_model"),
      ];
    case "conaf-nasa":
      return [
        observation(adapter, "public_api_sensor_agent", {
          id: "conaf-nasa-001",
          source: "sensor",
          text: "CONAF/NASA-style fire layer: no active thermal anomaly inside the Vitacura envelope.",
          confidence: 0.74,
          location: "Metropolitana",
          receivedAt,
        }, "No wildfire UI is generated for this incident.", "risk_model"),
      ];
    case "open-meteo":
      return [
        observation(adapter, "public_api_sensor_agent", {
          id: "openmeteo-001",
          source: "sensor",
          text: "Open-Meteo-style wind check: low wind escalation risk for smoke or debris spread.",
          confidence: 0.69,
          location: "Santiago Oriente",
          receivedAt,
        }, "Weather does not increase secondary incident probability.", "risk_model"),
      ];
    case "live-cameras":
      return [
        observation(adapter, "camera_agent", {
          id: "cam-vitacura-costanera",
          source: "camera",
          text: "Live seismic camera feed shows strong shaking and ground-level disruption near the corridor.",
          confidence: 0.78,
          location: "Costanera Norte / Vitacura",
          receivedAt: "14:28",
        }, "Camera closes the loop between seismic sensor event and public decision.", "camera_verification"),
        observation(adapter, "camera_agent", {
          id: "cam-alonso-cordova",
          source: "camera",
          text: "Street-level feed shows pedestrians outside buildings; no visible fire column.",
          confidence: 0.72,
          location: "Alonso de Cordova",
          receivedAt: "14:28",
        }, "Visual evidence reduces collapse/fire uncertainty.", "camera_verification"),
        observation(adapter, "camera_agent", {
          id: "cam-vespucio-tunnel",
          source: "camera",
          text: "Tunnel entry cameras show congestion but no structural obstruction.",
          confidence: 0.7,
          location: "Tunel San Cristobal access",
          receivedAt: "14:28",
        }, "Route pressure exists, but obstruction is not confirmed.", "camera_verification"),
        observation(adapter, "camera_agent", {
          id: "cam-costanera-followup",
          source: "camera",
          text: "Follow-up camera report shows glass fragments and stopped vehicles near access lanes.",
          confidence: 0.73,
          location: "Costanera Norte access",
          receivedAt: "14:31",
        }, "Post-approval camera evidence raises traffic obstruction risk.", "camera_verification"),
      ];
    case "social-listening":
      return [
        observation(adapter, "social_agent", {
          id: "social-vitacura-rumor",
          source: "social",
          text: "Posts mention cracked pavement near Costanera, but no confirmed building damage.",
          confidence: 0.49,
          location: "Vitacura",
          receivedAt: "14:29",
        }, "Social report creates contradiction, not direct escalation.", "contradiction"),
        observation(adapter, "social_agent", {
          id: "social-family-reports",
          source: "social",
          text: "Repeated citizen posts ask whether to avoid Costanera Norte exits and nearby schools.",
          confidence: 0.56,
          location: "Vitacura / Las Condes",
          receivedAt: "14:32",
        }, "Repeated public concern justifies a precautionary advisory after HITL.", "public_gate"),
      ];
  }
}

function wildfireObservations(adapter: SourceAdapterId): SourceObservation[] {
  const receivedAt = "16:43";

  switch (adapter) {
    case "csn":
      return [
        observation(adapter, "public_api_sensor_agent", {
          id: "csn-wildfire-negative",
          source: "sensor",
          text: "CSN-style feed: no relevant seismic trigger for the active incident.",
          confidence: 0.93,
          location: "Metropolitana",
          receivedAt,
        }, "Earthquake surfaces stay hidden.", "risk_model"),
      ];
    case "shoa-dmc":
      return [
        observation(adapter, "public_api_sensor_agent", {
          id: "dmc-renca-wind",
          source: "sensor",
          text: "DMC-style forecast: wind shifting south-east, smoke may cross residential edge.",
          confidence: 0.82,
          location: "Renca",
          receivedAt,
        }, "Wind makes evacuation routing more important.", "risk_model"),
      ];
    case "conaf-nasa":
      return [
        observation(adapter, "public_api_sensor_agent", {
          id: "conaf-nasa-renca-hotspot",
          source: "sensor",
          text: "CONAF/NASA-style thermal layer: active hotspot on hillside, advancing toward urban edge.",
          confidence: 0.88,
          location: "Cerro Renca",
          receivedAt,
        }, "Wildfire physics surface should be generated.", "map_focus"),
      ];
    case "open-meteo":
      return [
        observation(adapter, "public_api_sensor_agent", {
          id: "openmeteo-renca-wind",
          source: "sensor",
          text: "Open-Meteo-style wind model: gusts rising, smoke corridor moving toward schools.",
          confidence: 0.76,
          location: "Renca",
          receivedAt,
        }, "Evacuation UI should include wind-aware routes.", "risk_model"),
      ];
    case "live-cameras":
      return [
        observation(adapter, "camera_agent", {
          id: "cam-renca-hillside",
          source: "camera",
          text: "Live hillside camera shows smoke column and intermittent flame line.",
          confidence: 0.75,
          location: "Cerro Renca",
          receivedAt: "16:44",
        }, "Visual evidence supports escalation to evacuation planning.", "camera_verification"),
      ];
    case "social-listening":
      return [
        observation(adapter, "social_agent", {
          id: "social-renca-school",
          source: "social",
          text: "Citizen reports ask whether nearby school should shelter or evacuate.",
          confidence: 0.58,
          location: "Renca",
          receivedAt: "16:45",
        }, "Human-impact decision requires CivicGate.", "public_gate"),
      ];
  }
}

function observation(
  sourceAdapter: SourceAdapterId,
  agentId: AgentId,
  signal: Signal,
  operationalImplication: string,
  uiHint: SourceObservation["uiHint"],
): SourceObservation {
  return {
    id: `${sourceAdapter}-${signal.id}`,
    sourceAdapter,
    agentId,
    signal,
    operationalImplication,
    uiHint,
  };
}

const adapterLabels: Record<SourceAdapterId, string> = {
  csn: "CSN seismic adapter",
  "shoa-dmc": "SHOA / DMC coastal-weather adapter",
  "conaf-nasa": "CONAF / NASA wildfire adapter",
  "open-meteo": "Open-Meteo weather adapter",
  "live-cameras": "Live camera verification adapter",
  "social-listening": "Social signal adapter",
};
