import type { AgentId } from "@/lib/runtime/events";

export type CrisisAgentDefinition = {
  id: AgentId;
  label: string;
  role: string;
  listensTo: string[];
  output: string;
};

export const crisisAgents: CrisisAgentDefinition[] = [
  {
    id: "orchestrator",
    label: "Orchestrator Agent",
    role: "Prioritizes runtime events and coordinates agent handoffs.",
    listensTo: ["all agent events", "operator directives"],
    output: "handoffs, priorities, tool requests",
  },
  {
    id: "camera_agent",
    label: "Camera Verification Agent",
    role: "Pulls nearby feeds and closes the human visual verification loop.",
    listensTo: ["CCTV", "citizen video", "operator map target"],
    output: "visual evidence, uncertainty reduction",
  },
  {
    id: "social_agent",
    label: "Social Signal Agent",
    role: "Detects repeated citizen claims, rumors and contradictions.",
    listensTo: ["social media", "citizen reports"],
    output: "rumor clusters, contradictions",
  },
  {
    id: "public_api_sensor_agent",
    label: "Public API / Sensor Agent",
    role: "Integrates hard institutional and environmental signals.",
    listensTo: ["CSN", "SHOA", "CONAF/NASA", "Open-Meteo"],
    output: "ground-truth signal packet",
  },
  {
    id: "disaster_physics_agent",
    label: "Disaster Physics / Risk Agent",
    role: "Classifies the disaster model and operational risk envelope.",
    listensTo: ["sensor packet", "visual evidence", "social contradictions"],
    output: "risk zones, incident class, escalation risk",
  },
  {
    id: "ui_planner_agent",
    label: "UI Planner Agent",
    role: "Chooses which generated surfaces appear, move or disappear.",
    listensTo: ["shared incident state", "agent decisions"],
    output: "A2UI-style component plan",
  },
  {
    id: "gatekeeper_agent",
    label: "Gatekeeper Agent",
    role: "Separates autonomous actions from human-impact decisions.",
    listensTo: ["public impact risk", "approval policy"],
    output: "HITL gates, approval requirements",
  },
  {
    id: "tool_execution_agent",
    label: "Tool Execution Agent",
    role: "Runs Daytona, MCP and sandbox tools for operational artifacts.",
    listensTo: ["tool.started", "operator tool directives"],
    output: "tool artifacts, generated layers, action outputs",
  },
];

export function getCrisisAgent(id: AgentId) {
  return crisisAgents.find((agent) => agent.id === id);
}
