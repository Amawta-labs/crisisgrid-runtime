import {
  CustomEventSchema,
  EventType,
  RunFinishedEventSchema,
  RunStartedEventSchema,
  StateSnapshotEventSchema,
} from "@ag-ui/core";

import { crisisAgents } from "@/lib/agentic/agents";
import type { RuntimeEvent } from "@/lib/runtime/events";

export function toAgUiRuntimeEvents(events: RuntimeEvent[]) {
  const runId = `crisisgrid-${events[0]?.timestamp ?? "standby"}`;
  const threadId = "crisisgrid-runtime";
  const customEvents = events.map((event, index) =>
    CustomEventSchema.parse({
      type: EventType.CUSTOM,
      name: `crisisgrid.${event.type}`,
      value: {
        index,
        event,
      },
    }),
  );

  return [
    RunStartedEventSchema.parse({
      type: EventType.RUN_STARTED,
      threadId,
      runId,
    }),
    StateSnapshotEventSchema.parse({
      type: EventType.STATE_SNAPSHOT,
      snapshot: {
        protocol: "AG-UI",
        runtime: "CrisisGrid",
        eventCount: events.length,
        agents: crisisAgents.map((agent) => agent.id),
        activeAgents: Array.from(
          new Set(
            events.flatMap((event) =>
              event.type === "agent.handoff"
                ? [event.agentId, event.from, event.to]
                : [event.agentId],
            ),
          ),
        ),
      },
    }),
    ...customEvents,
    RunFinishedEventSchema.parse({
      type: EventType.RUN_FINISHED,
      threadId,
      runId,
    }),
  ];
}
