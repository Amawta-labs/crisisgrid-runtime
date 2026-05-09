import type { Signal, UiComponent, UiPlan } from "@/lib/crisis/schemas";
import type { MapLayer, RuntimeEvent } from "@/lib/runtime/events";

export type RuntimeState = {
  uiPlan: UiPlan | null;
  signals: Signal[];
  components: UiComponent[];
  mapLayers: MapLayer[];
  events: RuntimeEvent[];
  gates: Record<string, "required" | "approved">;
  tools: Record<
    string,
    "pending" | "running" | "done" | "failed" | "requires_approval"
  >;
};

export function createRuntimeState(uiPlan: UiPlan | null = null): RuntimeState {
  return {
    uiPlan,
    signals: [],
    components: uiPlan?.components ?? [],
    mapLayers: [],
    events: [],
    gates: {},
    tools: Object.fromEntries(
      (uiPlan?.toolActions ?? []).map((tool) => [tool.id, tool.status]),
    ),
  };
}

export function applyRuntimeEvent(
  state: RuntimeState,
  event: RuntimeEvent,
): RuntimeState {
  const nextState = {
    ...state,
    events: [...state.events, event],
  };

  switch (event.type) {
    case "signal.received":
      return {
        ...nextState,
        signals: upsertById(nextState.signals, event.signal),
      };

    case "ui.component.added":
      return {
        ...nextState,
        components: [...nextState.components, event.component],
      };

    case "ui.component.updated":
      return {
        ...nextState,
        components: nextState.components.map((component) =>
          component.type === event.componentType
            ? ({
                ...component,
                props: { ...component.props, ...event.patch },
              } as UiComponent)
            : component,
        ),
      };

    case "map.layer.added":
      return {
        ...nextState,
        mapLayers: upsertById(nextState.mapLayers, event.layer),
      };

    case "tool.started":
      return {
        ...nextState,
        tools: { ...nextState.tools, [event.toolId]: "running" },
      };

    case "tool.completed":
      return {
        ...nextState,
        tools: { ...nextState.tools, [event.toolId]: "done" },
        components: [
          ...nextState.components,
          ...event.generatedComponents,
        ],
        mapLayers: [
          ...nextState.mapLayers,
          ...event.generatedLayers,
        ],
      };

    case "gate.required":
      return {
        ...nextState,
        gates: { ...nextState.gates, [event.gateId]: "required" },
      };

    case "gate.approved":
      return {
        ...nextState,
        gates: { ...nextState.gates, [event.gateId]: "approved" },
      };

    case "agent.handoff":
      return nextState;
  }
}

function upsertById<T extends { id: string }>(items: T[], nextItem: T) {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id);

  if (existingIndex === -1) {
    return [...items, nextItem];
  }

  return items.map((item, index) => (index === existingIndex ? nextItem : item));
}
