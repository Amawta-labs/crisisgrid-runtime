"use client";

import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  FileText,
  GitBranch,
  ListChecks,
  MapPinned,
  RadioTower,
  Route,
  Send,
  ShieldCheck,
  TerminalSquare,
  Truck,
} from "lucide-react";

import type { UiComponent } from "@/lib/crisis/schemas";

import { C } from "../tokens";

type GeneratedSurfaceStackProps = {
  components: UiComponent[];
  daytonaDone: boolean;
  onApproveGate?: (actionId: string) => void;
  focusMode?: "briefing" | "execution" | "approval";
  maxVisible?: number;
};

const visibleGeneratedTypes = new Set<UiComponent["type"]>([
  "incident_card",
  "generated_map_surface",
  "risk_zone_layer",
  "resource_deployment_panel",
  "route_planner_panel",
  "contradiction_panel",
  "action_plan_board",
  "public_alert_draft",
  "civic_gate",
  "agent_trace_timeline",
  "tool_creation_panel",
]);

export function GeneratedSurfaceStack({
  components,
  daytonaDone,
  onApproveGate,
  focusMode = "briefing",
  maxVisible = 3,
}: GeneratedSurfaceStackProps) {
  const visibleComponents = orderGeneratedComponents(
    components.filter((component) => visibleGeneratedTypes.has(component.type)),
    focusMode,
  ).slice(0, maxVisible);

  if (visibleComponents.length === 0) {
    return null;
  }

  return (
    <aside
      style={{
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        overflow: "auto",
        height: "100%",
      }}
    >
      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 9,
          background: "rgba(2,8,12,0.88)",
          color: C.text,
          padding: "11px 12px",
          backdropFilter: "blur(18px)",
        }}
      >
        <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>
          UI Planner surface
        </div>
        <div style={{ marginTop: 5, fontSize: 15, fontWeight: 800 }}>
          {visibleComponents.length} active components
        </div>
      </div>

      {visibleComponents.map((component, index) => (
        <GeneratedSurfaceCard
          key={`${component.type}-${index}`}
          component={component}
          daytonaDone={daytonaDone}
          onApproveGate={onApproveGate}
        />
      ))}
    </aside>
  );
}

function GeneratedSurfaceCard({
  component,
  daytonaDone,
  onApproveGate,
}: {
  component: UiComponent;
  daytonaDone: boolean;
  onApproveGate?: (actionId: string) => void;
}) {
  switch (component.type) {
    case "incident_card":
      return (
        <SurfaceFrame
          icon={<AlertTriangle size={17} />}
          title="IncidentCard"
          source="ui_planner_agent"
          accent={severityColor(component.props.severity)}
        >
          <SurfaceTitle>{component.props.title}</SurfaceTitle>
          <SurfaceText>{component.props.summary}</SurfaceText>
          <MetaRow
            left={`severity: ${component.props.severity}`}
            right={`${Math.round(component.props.confidence * 100)}% confidence`}
          />
        </SurfaceFrame>
      );

    case "generated_map_surface":
      return (
        <SurfaceFrame
          icon={<MapPinned size={17} />}
          title="GeneratedMapSurface"
          source="disaster_physics_agent"
          accent={C.blue}
        >
          <SurfaceTitle>{component.props.label}</SurfaceTitle>
          <MetaRow
            left={`${component.props.radiusMeters}m radius`}
            right={component.props.severity}
          />
        </SurfaceFrame>
      );

    case "risk_zone_layer":
      return (
        <SurfaceFrame
          icon={<RadioTower size={17} />}
          title="RiskZoneLayer"
          source="daytona_tool_agent"
          accent={C.orange}
        >
          <SurfaceTitle>Daytona risk envelope</SurfaceTitle>
          <SurfaceText>{component.props.reason}</SurfaceText>
          <MetaRow
            left={`${component.props.radiusMeters}m radius`}
            right={component.props.severity}
          />
        </SurfaceFrame>
      );

    case "tool_creation_panel":
      return (
        <SurfaceFrame
          icon={<TerminalSquare size={17} />}
          title="ToolCreationPanel"
          source="ui_planner_agent"
          accent={daytonaDone ? C.green : C.violet}
        >
          <div style={{ display: "grid", gap: 8 }}>
            {component.props.tools.map((tool) => (
              <CompactRow
                key={tool.id}
                label={tool.label}
                value={`${tool.runtime} / ${daytonaDone ? "completed" : tool.status}`}
              />
            ))}
          </div>
        </SurfaceFrame>
      );

    case "action_plan_board":
      return (
        <SurfaceFrame
          icon={<ListChecks size={17} />}
          title="ActionPlanBoard"
          source={daytonaDone ? "daytona_tool_agent" : "ui_planner_agent"}
          accent={C.green}
        >
          <div style={{ display: "grid", gap: 8 }}>
            {component.props.actions.map((action) => (
              <CompactRow
                key={action.id}
                label={action.title}
                value={`${action.owner} / ${action.status}`}
              />
            ))}
          </div>
        </SurfaceFrame>
      );

    case "civic_gate":
      return (
        <SurfaceFrame
          icon={<ShieldCheck size={17} />}
          title="CivicGate"
          source="gatekeeper_agent"
          accent={C.green}
        >
          <SurfaceTitle>{component.props.title}</SurfaceTitle>
          <SurfaceText>{component.props.risk}</SurfaceText>
          <button
            onClick={() => onApproveGate?.(component.props.actionId)}
            style={{
              width: "100%",
              height: 38,
              marginTop: 12,
              border: `1px solid ${C.green}`,
              borderRadius: 7,
              background: "rgba(16,255,133,0.11)",
              color: C.text,
              cursor: "pointer",
              fontWeight: 800,
              textTransform: "uppercase",
              fontSize: 12,
            }}
          >
            {component.props.approvalLabel}
          </button>
        </SurfaceFrame>
      );

    case "public_alert_draft":
      return (
        <SurfaceFrame
          icon={<FileText size={17} />}
          title="PublicAlertDraft"
          source="gatekeeper_agent"
          accent={C.amber}
        >
          <SurfaceTitle>{component.props.channel}</SurfaceTitle>
          <SurfaceText>{component.props.message}</SurfaceText>
        </SurfaceFrame>
      );

    case "public_broadcast_panel":
      return (
        <SurfaceFrame
          icon={<Send size={17} />}
          title="XBroadcast"
          source="gatekeeper_agent"
          accent={C.blue}
        >
          <div
            style={{
              border: `1px solid rgba(30,167,255,0.24)`,
              borderRadius: 10,
              background: "rgba(255,255,255,0.035)",
              padding: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 999,
                  background: "#f7f9fb",
                  color: "#05070a",
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                X
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: C.text, fontSize: 13, fontWeight: 850 }}>
                    CrisisGrid
                  </span>
                  <BadgeCheck size={14} color={C.blue} />
                </div>
                <div style={{ color: C.muted, fontSize: 11 }}>
                  {component.props.handle} · {component.props.audience}
                </div>
              </div>
            </div>
            <SurfaceText>{component.props.message}</SurfaceText>
            <MetaRow
              left={`${component.props.message.length}/280 chars`}
              right={component.props.autonomy.replaceAll("_", " ")}
            />
          </div>
          <button
            onClick={() => onApproveGate?.(component.props.actionId)}
            style={{
              width: "100%",
              height: 38,
              marginTop: 12,
              border: `1px solid ${C.blue}`,
              borderRadius: 7,
              background: "rgba(30,167,255,0.12)",
              color: C.text,
              cursor: "pointer",
              fontWeight: 850,
              textTransform: "uppercase",
              fontSize: 12,
            }}
          >
            {component.props.approvalLabel}
          </button>
        </SurfaceFrame>
      );

    case "contradiction_panel":
      return (
        <SurfaceFrame
          icon={<GitBranch size={17} />}
          title="ContradictionPanel"
          source="social_agent"
          accent={C.violet}
        >
          <BulletList items={component.props.contradictions} />
        </SurfaceFrame>
      );

    case "agent_trace_timeline":
      return (
        <SurfaceFrame
          icon={<GitBranch size={17} />}
          title="AgentTraceTimeline"
          source="orchestrator"
          accent={C.blue}
        >
          <div style={{ display: "grid", gap: 8 }}>
            {component.props.events.map((event, index) => (
              <CompactRow key={`${event.label}-${index}`} label={event.label} value={event.detail} />
            ))}
          </div>
        </SurfaceFrame>
      );

    case "resource_deployment_panel":
      return (
        <SurfaceFrame
          icon={<Truck size={17} />}
          title="ResourceDeploymentPanel"
          source="ops_agent"
          accent={C.green}
        >
          <div style={{ display: "grid", gap: 8 }}>
            {component.props.resources.map((resource) => (
              <CompactRow key={resource.id} label={resource.label} value={resource.status} />
            ))}
          </div>
        </SurfaceFrame>
      );

    case "route_planner_panel":
      return (
        <SurfaceFrame
          icon={<Route size={17} />}
          title="RoutePlannerPanel"
          source="route_agent"
          accent={C.blue}
        >
          <div style={{ display: "grid", gap: 8 }}>
            {component.props.routes.map((route) => (
              <CompactRow
                key={route.id}
                label={route.label}
                value={`${route.status}${route.etaMinutes ? ` / ${route.etaMinutes}m` : ""}`}
              />
            ))}
          </div>
        </SurfaceFrame>
      );

    case "signal_inbox":
      return null;
  }
}

function SurfaceFrame({
  icon,
  title,
  source,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  source: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: `1px solid ${C.borderStrong}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
        background:
          "linear-gradient(135deg, rgba(5,14,22,0.96), rgba(2,8,12,0.94))",
        color: C.text,
        padding: 12,
        boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
        animation: "surfaceIn 420ms ease both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: accent }}>
          {icon}
          <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>
            {title}
          </span>
        </div>
        <span style={{ color: C.muted, fontSize: 10, textTransform: "uppercase" }}>
          {source}
        </span>
      </div>
      <div style={{ marginTop: 11 }}>{children}</div>
    </section>
  );
}

function orderGeneratedComponents(
  components: UiComponent[],
  focusMode: "briefing" | "execution" | "approval",
) {
  const priorities: Record<typeof focusMode, Partial<Record<UiComponent["type"], number>>> = {
    briefing: {
      incident_card: 0,
      generated_map_surface: 1,
      contradiction_panel: 2,
      tool_creation_panel: 3,
      agent_trace_timeline: 4,
    },
    execution: {
      risk_zone_layer: 0,
      action_plan_board: 1,
      tool_creation_panel: 2,
      incident_card: 3,
      generated_map_surface: 4,
    },
    approval: {
      civic_gate: 0,
      action_plan_board: 1,
      public_alert_draft: 2,
      risk_zone_layer: 3,
      contradiction_panel: 4,
    },
  };

  return [...components].sort((left, right) => {
    const leftPriority = priorities[focusMode][left.type] ?? 99;
    const rightPriority = priorities[focusMode][right.type] ?? 99;

    return leftPriority - rightPriority;
  });
}

function SurfaceTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14, fontWeight: 850, lineHeight: 1.35 }}>{children}</div>;
}

function SurfaceText({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 8, color: "#cbd4df", fontSize: 12, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

function MetaRow({ left, right }: { left: string; right: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginTop: 12,
        color: C.muted,
        fontSize: 11,
        textTransform: "uppercase",
      }}
    >
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

function CompactRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 3,
        border: `1px solid ${C.border}`,
        borderRadius: 7,
        background: "rgba(255,255,255,0.035)",
        padding: 8,
      }}
    >
      <span style={{ color: C.text, fontSize: 12, fontWeight: 750, lineHeight: 1.35 }}>
        {label}
      </span>
      <span style={{ color: C.muted, fontSize: 11, lineHeight: 1.35 }}>{value}</span>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div style={{ display: "grid", gap: 7 }}>
      {items.map((item) => (
        <div key={item} style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 6 }}>
          <CheckCircle2 size={14} color={C.violet} />
          <span style={{ color: "#cbd4df", fontSize: 12, lineHeight: 1.45 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function severityColor(severity: string) {
  if (severity === "critical") return C.red;
  if (severity === "high") return C.orange;
  if (severity === "medium") return C.amber;
  return C.blue;
}
