import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { crisisAgents } from "@/lib/agentic/agents";

const serviceAdapter = new ExperimentalEmptyAdapter();
const runtimeOrigin = getRuntimeOrigin();

const runtime = new CopilotRuntime({
  agents: {
    default: new HttpAgent({
      agentId: "default",
      description: "CrisisGrid default AG-UI orchestrator bridge",
      url: `${runtimeOrigin}/api/runtime/ag-ui`,
    }),
    crisisgrid: new HttpAgent({
      agentId: "crisisgrid",
      description: "CrisisGrid operational UI planner over AG-UI",
      url: `${runtimeOrigin}/api/runtime/ag-ui`,
    }),
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};

export async function GET() {
  return NextResponse.json({
    protocol: "copilotkit-runtime",
    runtimeUrl: "/api/copilotkit",
    purpose: "Frontend CopilotKit provider endpoint for CrisisGrid agentic UI.",
    agents: crisisAgents.map((agent) => ({
      id: agent.id,
      label: agent.label,
      role: agent.role,
      output: agent.output,
    })),
  });
}

function getRuntimeOrigin() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3020";
}
