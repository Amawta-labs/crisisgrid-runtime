import { A2uiMessageListSchema } from "@a2ui/web_core/v0_9";

import type { UiComponent } from "@/lib/crisis/schemas";

const A2UI_SURFACE_ID = "crisisgrid-runtime";
const A2UI_BASIC_CATALOG_ID = "https://a2ui.org/specification/v0_9/basic_catalog.json";

export function toA2UIMessages(components: UiComponent[], eventCount: number) {
  const componentTypes = components.map((component) => component.type);
  const messages = [
    {
      version: "v0.9" as const,
      createSurface: {
        surfaceId: A2UI_SURFACE_ID,
        catalogId: A2UI_BASIC_CATALOG_ID,
      },
    },
    {
      version: "v0.9" as const,
      updateComponents: {
        surfaceId: A2UI_SURFACE_ID,
        components: [
          {
            id: "root",
            component: "Column",
            children: ["title", "status", "components", "gate"],
          },
          {
            id: "title",
            component: "Text",
            text: { path: "/title" },
            variant: "title",
          },
          {
            id: "status",
            component: "Text",
            text: { path: "/status" },
          },
          {
            id: "components",
            component: "Text",
            text: { path: "/components" },
          },
          {
            id: "gate",
            component: "Text",
            text: { path: "/gate" },
          },
        ],
      },
    },
    {
      version: "v0.9" as const,
      updateDataModel: {
        surfaceId: A2UI_SURFACE_ID,
        path: "/",
        value: {
          title: "CrisisGrid A2UI surface",
          status: `${eventCount} runtime events compiled into declarative UI.`,
          components:
            componentTypes.length > 0
              ? `Generated components: ${componentTypes.join(", ")}`
              : "Waiting for the UI Planner to add components.",
          gate: componentTypes.includes("civic_gate")
            ? "Human approval gate is active."
            : "No public-action gate active yet.",
        },
      },
    },
  ];

  return A2uiMessageListSchema.parse(messages);
}

export { A2UI_SURFACE_ID };
