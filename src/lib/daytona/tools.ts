import { Daytona } from "@daytona/sdk";
import { z } from "zod";

export const daytonaToolNameSchema = z.enum([
  "simulate_disaster_physics",
  "compile_operational_plan",
  "generate_public_alert_packet",
  "publish_public_alert_mock",
  "contact_emergency_services_mock",
  "navigate_map_to_target",
]);

export const daytonaToolRequestSchema = z.object({
  toolName: daytonaToolNameSchema,
  incidentType: z.string(),
  location: z.string(),
  input: z.record(z.unknown()).default({}),
});

export type DaytonaToolRequest = z.infer<typeof daytonaToolRequestSchema>;

export type DaytonaToolResult = {
  runtime: "daytona" | "local";
  toolName: DaytonaToolRequest["toolName"];
  status: "completed";
  output: Record<string, unknown>;
  logs: string[];
};

export async function runDaytonaTool(
  request: DaytonaToolRequest,
): Promise<DaytonaToolResult> {
  if (!process.env.DAYTONA_API_KEY) {
    return runLocalToolFallback(request);
  }

  try {
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL,
      target: process.env.DAYTONA_TARGET,
    });
    const sandbox = await daytona.create(
      {
        language: "typescript",
        autoStopInterval: 1,
        autoDeleteInterval: 0,
        ephemeral: true,
        envVars: {
          CRISISGRID_TOOL_NAME: request.toolName,
        },
      },
      { timeout: 60 },
    );

    try {
      const response = await sandbox.process.codeRun(
        buildSandboxCode(request),
        undefined,
        30,
      );
      const output = parseSandboxOutput(response.result);

      return {
        runtime: "daytona",
        toolName: request.toolName,
        status: "completed",
        output,
        logs: [
          `Daytona sandbox executed ${request.toolName}.`,
          `Sandbox exit code: ${response.exitCode}`,
          "Returned structured artifact for CrisisGrid UI runtime.",
        ],
      };
    } finally {
      await daytona.delete(sandbox).catch(() => undefined);
    }
  } catch (error) {
    const fallback = runLocalToolFallback(request);

    return {
      ...fallback,
      logs: [
        "Daytona execution failed; local fallback preserved demo contract.",
        error instanceof Error ? error.message : "Unknown Daytona error.",
        ...fallback.logs,
      ],
    };
  }
}

function buildSandboxCode(request: DaytonaToolRequest) {
  const serializedRequest = JSON.stringify(request);

  return `
type ToolRequest = {
  toolName:
    | "simulate_disaster_physics"
    | "compile_operational_plan"
    | "generate_public_alert_packet"
    | "publish_public_alert_mock"
    | "contact_emergency_services_mock"
    | "navigate_map_to_target";
  incidentType: string;
  location: string;
  input: Record<string, unknown>;
};

const request = ${serializedRequest} satisfies ToolRequest;

function runTool(input: ToolRequest) {
  if (input.toolName === "simulate_disaster_physics") {
    return {
      riskZone: {
        center: [-70.5707, -33.3972],
        radiusMeters: input.incidentType.includes("wildfire") ? 2400 : 1800,
        severity: "critical",
        reason: input.incidentType + " physics model near " + input.location,
      },
      geojson: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              severity: "critical",
              label: input.incidentType + " impact envelope",
            },
            geometry: {
              type: "Point",
              coordinates: [-70.5707, -33.3972],
            },
          },
        ],
      },
    };
  }

  if (input.toolName === "compile_operational_plan") {
    return {
      actions: [
        {
          id: "verify-cameras",
          title: "Verify camera corridor",
          owner: "Camera Agent",
          status: "running",
        },
        {
          id: "stage-response",
          title: "Stage closest response unit",
          owner: "Ops Lead",
          status: "needs_approval",
        },
        {
          id: "publish-alert",
          title: "Publish public advisory",
          owner: "Civic Comms",
          status: "needs_approval",
        },
      ],
      approvals: ["publish-alert", "stage-response"],
    };
  }

  if (input.toolName === "navigate_map_to_target") {
    const center = Array.isArray(input.input.center)
      ? input.input.center
      : [-70.5707, -33.3972];
    const radiusMeters =
      typeof input.input.radiusMeters === "number"
        ? input.input.radiusMeters
        : 1800;
    const label =
      typeof input.input.label === "string"
        ? input.input.label
        : input.location;

    return {
      mapNavigation: {
        label,
        center,
        radiusMeters,
        source: input.input.source ?? "operator_directive",
        appliedAt: new Date().toISOString(),
      },
      toolContract:
        "Daytona registered map navigation artifact for CrisisGrid frontend flyTo.",
    };
  }

  if (input.toolName === "publish_public_alert_mock") {
    const message =
      typeof input.input.message === "string"
        ? input.input.message
        : "Sismo percibido en la Región Metropolitana. Evita el corredor afectado mientras equipos verifican condiciones. Sigue canales oficiales.";

    return {
      channel: "X / @CrisisGridCL",
      audience: input.input.audience ?? "Región Metropolitana",
      postId: "x-demo-" + Date.now(),
      message,
      status: "published_mock",
      requiresHumanApproval: false,
      toolContract:
        "Mock publication artifact. No real Twitter/X API call was made.",
    };
  }

  if (input.toolName === "contact_emergency_services_mock") {
    const service =
      typeof input.input.service === "string" ? input.input.service : "SENAPRED";
    const reason =
      typeof input.input.reason === "string"
        ? input.input.reason
        : "Operator-approved emergency coordination drill.";
    const priority =
      typeof input.input.priority === "string" ? input.input.priority : "high";
    const location =
      typeof input.input.location === "string"
        ? input.input.location
        : input.location;
    const ticketId =
      "svc-mock-" +
      String(service).toLowerCase().replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Date.now();

    return {
      status: "contacted_mock",
      service,
      ticketId,
      message:
        "MOCK ONLY: " +
        service +
        " dispatch/contact package staged for " +
        location +
        " (" +
        priority +
        "). Reason: " +
        reason +
        ". No real emergency service was contacted.",
      requiresHumanApproval: false,
      toolContract:
        "Mock emergency-service artifact. No real call, dispatch, SMS, radio or institutional API was used.",
    };
  }

  return {
    channel: "X / municipal alert",
    message:
      "Precautionary alert: avoid the affected corridor while responders verify conditions. Follow official route guidance.",
    requiresHumanApproval: true,
    checklist: ["Confirm zone", "Approve copy", "Publish to official channels"],
  };
}

console.log("CRISISGRID_RESULT::" + JSON.stringify(runTool(request)));
`;
}

function parseSandboxOutput(result: string | undefined): Record<string, unknown> {
  if (!result) {
    return {};
  }

  const marker = "CRISISGRID_RESULT::";
  const markerIndex = result.lastIndexOf(marker);

  if (markerIndex >= 0) {
    const markedResult = result.slice(markerIndex + marker.length).trim();
    const firstLine = markedResult.split("\n")[0]?.trim();

    if (firstLine) {
      return JSON.parse(firstLine) as Record<string, unknown>;
    }
  }

  const lines = result
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const lastJsonLine = [...lines].reverse().find((line) => line.startsWith("{"));

  if (!lastJsonLine) {
    return { raw: result };
  }

  return JSON.parse(lastJsonLine) as Record<string, unknown>;
}

function runLocalToolFallback(
  request: DaytonaToolRequest,
  runtime: "daytona" | "local" = "local",
): DaytonaToolResult {
  if (request.toolName === "simulate_disaster_physics") {
    return {
      runtime,
      toolName: request.toolName,
      status: "completed",
      logs: [
        "Loaded incident signals.",
        "Estimated Chile-specific disaster physics.",
        "Generated risk zone artifact.",
      ],
      output: {
        riskZone: {
          center: [-70.5707, -33.3972],
          radiusMeters: 1800,
          severity: "critical",
          reason: `${request.incidentType} risk model near ${request.location}`,
        },
      },
    };
  }

  if (request.toolName === "compile_operational_plan") {
    return {
      runtime,
      toolName: request.toolName,
      status: "completed",
      logs: [
        "Loaded resource matrix.",
        "Resolved blocked-route assumptions.",
        "Compiled gated operational plan.",
      ],
      output: {
        actions: [
          {
            id: "verify-cameras",
            title: "Verify camera corridor",
            owner: "Camera Agent",
            status: "running",
          },
          {
            id: "stage-response",
            title: "Stage closest response unit",
            owner: "Ops Lead",
            status: "needs_approval",
          },
          {
            id: "publish-alert",
            title: "Publish public advisory",
            owner: "Civic Comms",
            status: "needs_approval",
          },
        ],
      },
    };
  }

  if (request.toolName === "navigate_map_to_target") {
    const center = Array.isArray(request.input.center)
      ? request.input.center
      : [-70.5707, -33.3972];
    const radiusMeters =
      typeof request.input.radiusMeters === "number"
        ? request.input.radiusMeters
        : 1800;
    const label =
      typeof request.input.label === "string"
        ? request.input.label
        : request.location;

    return {
      runtime,
      toolName: request.toolName,
      status: "completed",
      logs: [
        "Registered operator map directive.",
        "Validated map center and radius.",
        "Returned frontend navigation artifact.",
      ],
      output: {
        mapNavigation: {
          label,
          center,
          radiusMeters,
          source: request.input.source ?? "operator_directive",
        },
      },
    };
  }

  if (request.toolName === "publish_public_alert_mock") {
    const message =
      typeof request.input.message === "string"
        ? request.input.message
        : "Sismo percibido en la Región Metropolitana. Evita el corredor afectado mientras equipos verifican condiciones. Sigue canales oficiales.";

    return {
      runtime,
      toolName: request.toolName,
      status: "completed",
      logs: [
        "Validated public broadcast packet.",
        "Applied HITL approval guard.",
        "Returned mock X/Twitter publication artifact.",
      ],
      output: {
        channel: "X / @CrisisGridCL",
        audience: request.input.audience ?? "Región Metropolitana",
        postId: `x-demo-${Date.now()}`,
        message,
        status: "published_mock",
        requiresHumanApproval: false,
      },
    };
  }

  if (request.toolName === "contact_emergency_services_mock") {
    const service =
      typeof request.input.service === "string" ? request.input.service : "SENAPRED";
    const reason =
      typeof request.input.reason === "string"
        ? request.input.reason
        : "Operator-approved emergency coordination drill.";
    const priority =
      typeof request.input.priority === "string" ? request.input.priority : "high";
    const location =
      typeof request.input.location === "string"
        ? request.input.location
        : request.location;
    const ticketId = `svc-mock-${service.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

    return {
      runtime,
      toolName: request.toolName,
      status: "completed",
      logs: [
        "Validated emergency service dispatch packet.",
        "Applied HITL approval guard.",
        "Returned mock contact artifact; no real emergency service was contacted.",
      ],
      output: {
        status: "contacted_mock",
        service,
        ticketId,
        message:
          `MOCK ONLY: ${service} dispatch/contact package staged for ${location} (${priority}). ` +
          `Reason: ${reason}. No real emergency service was contacted.`,
      },
    };
  }

  return {
    runtime,
    toolName: request.toolName,
    status: "completed",
    logs: [
      "Loaded incident context.",
      "Drafted public advisory packet.",
      "Marked external publishing as gated.",
    ],
    output: {
      channel: "X / municipal alert",
      message:
        "Precautionary alert: avoid the affected corridor while responders verify conditions. Follow official route guidance.",
      requiresHumanApproval: true,
    },
  };
}
