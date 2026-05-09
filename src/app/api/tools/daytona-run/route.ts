import { NextResponse } from "next/server";

import {
  daytonaToolRequestSchema,
  runDaytonaTool,
} from "@/lib/daytona/tools";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const toolRequest = daytonaToolRequestSchema.parse(body);
  const result = await runDaytonaTool(toolRequest);

  return NextResponse.json(result);
}
