import { NextResponse } from "next/server";

import { scenarios } from "@/lib/crisis/scenarios";
import {
  getMockSourceSnapshot,
  isSourceAdapterId,
} from "@/lib/sources/mock-source-adapters";

type SourceRouteContext = {
  params: Promise<{
    source: string;
  }>;
};

export async function GET(request: Request, context: SourceRouteContext) {
  const { source } = await context.params;

  if (!isSourceAdapterId(source)) {
    return NextResponse.json(
      {
        error: "unknown_source_adapter",
        source,
      },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const scenarioId = url.searchParams.get("scenario");
  const scenario =
    scenarios.find((candidate) => candidate.id === scenarioId) ??
    scenarios.find((candidate) => candidate.id === "scenario_01_earthquake") ??
    scenarios[0];

  return NextResponse.json(getMockSourceSnapshot(source, scenario), {
    headers: {
      "cache-control": "no-store",
    },
  });
}
