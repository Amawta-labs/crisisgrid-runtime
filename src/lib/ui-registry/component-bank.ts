export type ComponentBankItem = {
  type: string;
  surface: "signals" | "map" | "planning" | "verification" | "tools" | "decision" | "trace";
  purpose: string;
  useWhen: string;
  requiredProps: string[];
};

export const crisisComponentBank: ComponentBankItem[] = [
  {
    type: "signal_inbox",
    surface: "signals",
    purpose: "Show chaotic incoming signals before a stable incident exists.",
    useWhen: "Any scenario starts or new evidence arrives.",
    requiredProps: ["title"],
  },
  {
    type: "incident_card",
    surface: "planning",
    purpose: "Summarize the current incident hypothesis.",
    useWhen: "The orchestrator has enough evidence to name the event.",
    requiredProps: ["title", "summary", "severity", "confidence"],
  },
  {
    type: "generated_map_surface",
    surface: "map",
    purpose: "Create an operational map centered on the incident.",
    useWhen: "Location and radius are known or estimated.",
    requiredProps: ["center", "radiusMeters", "severity", "label"],
  },
  {
    type: "risk_zone_layer",
    surface: "map",
    purpose: "Overlay the risk envelope returned by physics or Daytona tools.",
    useWhen: "A tool or physics agent estimates an impact area.",
    requiredProps: ["center", "radiusMeters", "severity", "reason"],
  },
  {
    type: "resource_deployment_panel",
    surface: "planning",
    purpose: "Show resources the operator can stage or deploy.",
    useWhen: "The plan requires field teams, inspectors, alerts or shelters.",
    requiredProps: ["resources"],
  },
  {
    type: "route_planner_panel",
    surface: "map",
    purpose: "Show access, evacuation or inspection routes.",
    useWhen: "Movement, congestion, evacuation or access is part of the incident.",
    requiredProps: ["routes"],
  },
  {
    type: "contradiction_panel",
    surface: "verification",
    purpose: "Expose uncertainty and conflicting evidence.",
    useWhen: "Signals disagree or confidence is low.",
    requiredProps: ["contradictions"],
  },
  {
    type: "action_plan_board",
    surface: "planning",
    purpose: "Render prioritized operational actions with owners and statuses.",
    useWhen: "The agent has a concrete plan or Daytona returns one.",
    requiredProps: ["actions"],
  },
  {
    type: "public_alert_draft",
    surface: "decision",
    purpose: "Draft external communication for approval.",
    useWhen: "Public communication is likely but needs human approval.",
    requiredProps: ["channel", "message"],
  },
  {
    type: "civic_gate",
    surface: "decision",
    purpose: "Require HITL approval for sensitive or public actions.",
    useWhen: "The action could move people, create panic, publish alerts or deploy resources.",
    requiredProps: ["title", "risk", "actionId", "approvalLabel"],
  },
  {
    type: "agent_trace_timeline",
    surface: "trace",
    purpose: "Show the agent handoff and reasoning timeline.",
    useWhen: "The demo needs to make multi-agent orchestration visible.",
    requiredProps: ["events"],
  },
  {
    type: "tool_creation_panel",
    surface: "tools",
    purpose: "Show tools proposed or created by the agent.",
    useWhen: "Daytona, MCP or local tools are needed to produce artifacts.",
    requiredProps: ["tools"],
  },
];

export function componentBankPrompt() {
  return crisisComponentBank
    .map(
      (item) =>
        `- ${item.type} [surface: ${item.surface}]: ${item.purpose} Use when: ${item.useWhen}. Required props: ${item.requiredProps.join(", ")}.`,
    )
    .join("\n");
}
