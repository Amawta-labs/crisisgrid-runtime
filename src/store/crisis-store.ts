"use client";

import { create } from "zustand";

import type { UiPlan } from "@/lib/crisis/schemas";
import type { RuntimeEvent } from "@/lib/runtime/events";
import {
  applyRuntimeEvent,
  createRuntimeState,
  type RuntimeState,
} from "@/lib/runtime/orchestrator";

type CrisisStore = RuntimeState & {
  reset: (uiPlan?: UiPlan | null) => void;
  dispatch: (event: RuntimeEvent) => void;
  dispatchMany: (events: RuntimeEvent[]) => void;
};

export const useCrisisStore = create<CrisisStore>((set) => ({
  ...createRuntimeState(),
  reset: (uiPlan = null) => set(() => createRuntimeState(uiPlan)),
  dispatch: (event) =>
    set((state) => ({
      ...state,
      ...applyRuntimeEvent(state, event),
    })),
  dispatchMany: (events) =>
    set((state) => {
      const nextRuntimeState = events.reduce<RuntimeState>(
        (nextState, event) => applyRuntimeEvent(nextState, event),
        state,
      );

      return {
        ...state,
        ...nextRuntimeState,
      };
    }),
}));
