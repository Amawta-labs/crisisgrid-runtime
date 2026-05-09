import { NextResponse } from "next/server";

import { buildVitacuraEarthquakeOrchestration } from "@/lib/agentic/orchestration";
import { planCrisisSurface } from "@/lib/agentic/langchain-planner";
import { scenarios } from "@/lib/crisis/scenarios";
import {
  getAllMockSourceSnapshots,
  sourceAdapterIds,
  type SourceSnapshot,
} from "@/lib/sources/mock-source-adapters";

const PLANNER_TIMEOUT_MS = 2200;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scenario =
    scenarios.find((candidate) => candidate.id === url.searchParams.get("scenario")) ??
    scenarios.find((candidate) => candidate.id === "scenario_01_earthquake") ??
    scenarios[0];
  const plannerMode = url.searchParams.get("planner");
  const shouldUseLivePlanner =
    plannerMode === "gemini" || process.env.CRISISGRID_LIVE_PLANNER === "true";
  const [plannerDecision, sourceSnapshots] = await Promise.all([
    shouldUseLivePlanner
      ? withTimeout(planCrisisSurface(scenario), PLANNER_TIMEOUT_MS)
      : Promise.resolve(undefined),
    collectSourceSnapshots(request, scenario.id),
  ]);

  return NextResponse.json(
    buildVitacuraEarthquakeOrchestration(scenario, plannerDecision, sourceSnapshots),
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timeout = setTimeout(() => resolve(undefined), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function collectSourceSnapshots(
  request: Request,
  scenarioId: string,
): Promise<SourceSnapshot[]> {
  const origin = getRequestOrigin(request);

  const snapshots = await Promise.all(
    sourceAdapterIds.map(async (source) => {
      try {
        const response = await fetch(
          `${origin}/api/sources/${source}?scenario=${encodeURIComponent(scenarioId)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(`Source ${source} returned ${response.status}`);
        }

        return (await response.json()) as SourceSnapshot;
      } catch {
        return null;
      }
    }),
  );
  const availableSnapshots = snapshots.filter(Boolean) as SourceSnapshot[];

  if (availableSnapshots.length === sourceAdapterIds.length) {
    return availableSnapshots;
  }

  const scenario =
    scenarios.find((candidate) => candidate.id === scenarioId) ??
    scenarios.find((candidate) => candidate.id === "scenario_01_earthquake") ??
    scenarios[0];

  return getAllMockSourceSnapshots(scenario);
}

function getRequestOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "http";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    return `${forwardedProto}://${host}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3020";
}
