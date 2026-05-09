import { NextResponse } from "next/server";
import { z } from "zod";

import { parseRuntimeEvent, runtimeEventSchema } from "@/lib/runtime/events";

const requestSchema = z.object({
  events: z.array(runtimeEventSchema).optional(),
  event: runtimeEventSchema.optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const payload = requestSchema.parse(body);
  const events = payload.events ?? (payload.event ? [payload.event] : []);
  const parsedEvents = events.map(parseRuntimeEvent);

  return NextResponse.json({
    accepted: parsedEvents.length,
    events: parsedEvents,
  });
}
