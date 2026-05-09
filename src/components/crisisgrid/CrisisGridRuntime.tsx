"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BadgeCheck, BrainCircuit, Eye, RadioTower, Satellite, Send } from "lucide-react";

import type { OrchestrationPlan } from "@/lib/agentic/orchestration";
import { crisisAgents, getCrisisAgent } from "@/lib/agentic/agents";
import type { UiComponent } from "@/lib/crisis/schemas";
import type { MapLayer, RuntimeEvent } from "@/lib/runtime/events";
import { useCrisisStore } from "@/store/crisis-store";

import { MapCanvas, type MapTarget, type OperatorMapTarget } from "./components/MapCanvas";
import { GeneratedSurfaceStack } from "./generated/GeneratedSurfaceStack";
import { LaunchScreen } from "./LaunchScreen";
import { C } from "./tokens";

type ToolRunResponse = {
  runtime: "daytona" | "local";
  toolName?: string;
  output: Record<string, unknown>;
  logs: string[];
};

type PublicBroadcastComponent = Extract<UiComponent, { type: "public_broadcast_panel" }>;
type CivicGateComponent = Extract<UiComponent, { type: "civic_gate" }>;
type ActionPlanComponent = Extract<UiComponent, { type: "action_plan_board" }>;
type ActionPlanAction = ActionPlanComponent["props"]["actions"][number];
type ActionPlanStatus = ActionPlanAction["status"];

const cameraAssets: Record<string, { src: string; kind: "image" | "video" }> = {
  "cam-vitacura-costanera": {
    src: "/camera-feeds/terremoto.mp4",
    kind: "video",
  },
  "cam-alonso-cordova": {
    src: "/camera-feeds/autopista-central.jpg",
    kind: "image",
  },
  "cam-vespucio-tunnel": {
    src: "/camera-feeds/valparaiso.jpg",
    kind: "image",
  },
};

const operatorMapTargets: OperatorMapTarget[] = [
  {
    id: "costanera-vitacura",
    label: "Vitacura / Costanera",
    source: "operator_directive",
    center: [-70.5707, -33.3972],
    radiusMeters: 1800,
  },
  {
    id: "shoa-valparaiso",
    label: "SHOA Valparaiso coast",
    source: "operator_directive",
    center: [-71.6273, -33.0472],
    radiusMeters: 3200,
  },
  {
    id: "conaf-metropolitano",
    label: "CONAF Cerro San Cristobal",
    source: "operator_directive",
    center: [-70.6331, -33.4179],
    radiusMeters: 2100,
  },
];

export default function CrisisGridRuntime() {
  const [started, setStarted] = useState(false);
  const [bootHoldComplete, setBootHoldComplete] = useState(false);
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useState<Set<string>>(() => new Set());
  const [handledGateActionIds, setHandledGateActionIds] = useState<Set<string>>(() => new Set());
  const [actionStatusOverrides, setActionStatusOverrides] = useState<Record<string, ActionPlanStatus>>({});
  const timersRef = useRef<number[]>([]);
  const actionQueueRef = useRef<OrchestrationPlan["events"]>([]);
  const {
    reset,
    dispatch,
    signals,
    components,
    mapLayers,
    events,
    gates,
    tools,
  } = useCrisisStore();

  const runDaytonaTool = useCallback(async (event: Extract<RuntimeEvent, { type: "tool.started" }>) => {
    const response = await fetch("/api/tools/daytona-run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        toolName: event.toolName,
        incidentType: String(event.input.incidentType ?? "earthquake"),
        location: String(event.input.location ?? "Vitacura"),
        input: event.input,
      }),
    });
    const result = (await response.json()) as ToolRunResponse;
    const generatedComponents = buildComponentsFromToolResult(result);

    dispatch({
      id: `evt-${event.toolId}-completed`,
      type: "tool.completed",
      timestamp: new Date().toISOString(),
      agentId: event.agentId,
      toolId: event.toolId,
      runtime: result.runtime,
      output: result.output,
      generatedComponents,
      generatedLayers: buildLayersFromToolResult(result),
    });
  }, [dispatch]);

  const startOrchestration = useCallback(async () => {
    setStarted(true);
    reset();
    setDismissedBroadcastIds(new Set());
    setHandledGateActionIds(new Set());
    setActionStatusOverrides({});
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    actionQueueRef.current = [];

    const response = await fetch("/api/agent/orchestrate");
    const plan = (await response.json()) as OrchestrationPlan;

    for (const scheduledEvent of plan.events) {
      if (scheduledEvent.actionDelayMs !== undefined) {
        actionQueueRef.current.push(scheduledEvent);
        continue;
      }

      const timer = window.setTimeout(() => {
        dispatch(scheduledEvent.event);

        if (scheduledEvent.event.type === "tool.started") {
          void runDaytonaTool(scheduledEvent.event);
        }
      }, scheduledEvent.delayMs);

      timersRef.current.push(timer);
    }
  }, [dispatch, reset, runDaytonaTool]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBootHoldComplete(true);
      void startOrchestration();
    }, 7200);

    return () => {
      window.clearTimeout(timer);
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, [startOrchestration]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "r") {
        void startOrchestration();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startOrchestration]);

  function approveGate(actionId: string) {
    setHandledGateActionIds((current) => {
      const next = new Set(current);
      next.add(actionId);
      return next;
    });
    setActionStatus(actionId, "done");

    dispatch({
      id: `evt-${actionId}-approved`,
      type: "gate.approved",
      timestamp: new Date().toISOString(),
      agentId: "gatekeeper_agent",
      gateId: "public-alert-gate",
      actionId,
      approvedBy: "operator",
    });

    dispatch({
      id: `evt-${actionId}-public-alert`,
      type: "ui.component.added",
      timestamp: new Date().toISOString(),
      agentId: "gatekeeper_agent",
      component: {
        type: "public_alert_draft",
        props: {
          channel: "SENAPRED / municipal advisory",
          message:
            "Precautionary advisory: avoid the Vitacura-Costanera corridor while inspection teams verify seismic impact. Keep routes clear for emergency vehicles.",
        },
      },
    });

    for (const scheduledEvent of actionQueueRef.current) {
      const timer = window.setTimeout(() => {
        dispatch(scheduledEvent.event);

        if (scheduledEvent.event.type === "tool.started") {
          void runDaytonaTool(scheduledEvent.event);
        }
      }, scheduledEvent.actionDelayMs);

      timersRef.current.push(timer);
    }

    actionQueueRef.current = [];
  }

  function rejectGate(actionId: string) {
    setHandledGateActionIds((current) => {
      const next = new Set(current);
      next.add(actionId);
      return next;
    });
    setActionStatus(actionId, "queued");

    dispatch({
      id: `evt-${actionId}-held-by-operator`,
      type: "ui.component.added",
      timestamp: new Date().toISOString(),
      agentId: "gatekeeper_agent",
      component: {
        type: "public_alert_draft",
        props: {
          channel: "Operator decision",
          message:
            "Public advisory held. CrisisGrid will continue monitoring cameras and social signals before escalation.",
        },
      },
    });
  }

  function setActionStatus(actionId: string, status: ActionPlanStatus) {
    setActionStatusOverrides((current) => ({
      ...current,
      [actionId]: status,
    }));
  }

  function handleActionPlanAction(action: ActionPlanAction) {
    if (action.status === "done") {
      return;
    }

    if (action.status === "needs_approval") {
      approveGate(action.id);
      return;
    }

    const nextStatus: ActionPlanStatus = action.status === "running" ? "done" : "running";
    setActionStatus(action.id, nextStatus);

    dispatch({
      id: `evt-action-${action.id}-${nextStatus}`,
      type: "ui.component.added",
      timestamp: new Date().toISOString(),
      agentId: "orchestrator",
      component: {
        type: "public_alert_draft",
        props: {
          channel: "Operational action",
          message:
            nextStatus === "done"
              ? `${action.title} completed by ${action.owner}.`
              : `${action.title} is now running under ${action.owner}.`,
        },
      },
    });
  }

  function dismissBroadcast(actionId: string) {
    setDismissedBroadcastIds((current) => {
      const next = new Set(current);
      next.add(actionId);
      return next;
    });
  }

  function authorizeBroadcast(component: PublicBroadcastComponent) {
    dismissBroadcast(component.props.actionId);

    dispatch({
      id: `evt-${component.props.actionId}-approved`,
      type: "gate.approved",
      timestamp: new Date().toISOString(),
      agentId: "gatekeeper_agent",
      gateId: "x-broadcast-gate",
      actionId: component.props.actionId,
      approvedBy: "operator",
    });

    const event: Extract<RuntimeEvent, { type: "tool.started" }> = {
      id: "evt-publish-x-rm-alert-started",
      type: "tool.started",
      timestamp: new Date().toISOString(),
      agentId: "tool_execution_agent",
      toolId: component.props.actionId,
      toolName: "publish_public_alert_mock",
      runtime: "daytona",
      input: {
        incidentType: "earthquake",
        location: component.props.audience,
        audience: component.props.audience,
        handle: component.props.handle,
        message: component.props.message,
      },
    };

    dispatch(event);
    void runDaytonaTool(event);
  }

  function requestMapNavigation(target: OperatorMapTarget) {
    const timestamp = new Date().toISOString();
    const toolId = `navigate-map-${target.id}`;
    const event: Extract<RuntimeEvent, { type: "tool.started" }> = {
      id: `evt-${toolId}-started`,
      type: "tool.started",
      timestamp,
      agentId: "orchestrator",
      toolId,
      toolName: "navigate_map_to_target",
      runtime: "daytona",
      input: {
        incidentType: "operator_map_navigation",
        location: target.label,
        source: target.source,
        label: target.label,
        center: target.center,
        radiusMeters: target.radiusMeters,
      },
    };

    dispatch(event);

    window.setTimeout(() => {
      dispatch({
        id: `evt-${toolId}-map-updated`,
        type: "ui.component.updated",
        timestamp: new Date().toISOString(),
        agentId: "orchestrator",
        componentType: "generated_map_surface",
        patch: {
          center: target.center,
          radiusMeters: target.radiusMeters,
          label: `${target.label} - operator-directed camera move`,
        },
      });
    }, 260);

    void runDaytonaTool(event);
  }

  const cameraSignals = signals.filter((signal) => signal.source === "camera");
  const hasAnyRuntimeEvent = events.length > 0;
  const hasMap = components.some((component) => component.type === "generated_map_surface") || mapLayers.length > 0;
  const activeCivicGates = useMemo(
    () =>
      components.filter(
        (component): component is CivicGateComponent =>
          component.type === "civic_gate" &&
          !handledGateActionIds.has(component.props.actionId),
      ),
    [components, handledGateActionIds],
  );
  const pendingBroadcast = useMemo(
    () =>
      components.find(
        (component): component is PublicBroadcastComponent =>
          component.type === "public_broadcast_panel" &&
          !dismissedBroadcastIds.has(component.props.actionId),
    ),
    [components, dismissedBroadcastIds],
  );
  const dockComponents = useMemo(
    () =>
      components
        .filter((component) => component.type !== "public_broadcast_panel")
        .filter(
          (component) =>
            component.type !== "civic_gate" ||
            !handledGateActionIds.has(component.props.actionId),
        )
        .map((component) => {
          if (component.type !== "action_plan_board") {
            return component;
          }

          return {
            ...component,
            props: {
              ...component.props,
              actions: component.props.actions.map((action) => ({
                ...action,
                status: actionStatusOverrides[action.id] ?? action.status,
              })),
            },
          };
        }),
    [components, handledGateActionIds, actionStatusOverrides],
  );
  const hasGate =
    activeCivicGates.length > 0 ||
    Boolean(pendingBroadcast) ||
    Object.entries(gates).some(
      ([gateId, status]) => status === "required" && gateId !== "public-alert-gate",
    );
  const hasDaytonaOutput = Object.values(tools).includes("done");
  const mapTarget = useMemo(
    () => resolveMapTarget(components, mapLayers),
    [components, mapLayers],
  );
  const latestEvent = events[events.length - 1];
  const focusMode = hasGate ? "approval" : hasDaytonaOutput ? "execution" : "briefing";
  const generatedDockVisible = dockComponents.some((component) => shouldDockComponent(component.type));
  const dockWidth = generatedDockVisible ? (hasGate ? 376 : 342) : 0;
  const maxVisibleComponents = focusMode === "briefing" ? 1 : 2;
  const activeAgents = useMemo(() => {
    const eventAgentIds = new Set(events.map((event) => event.agentId));
    const handoffTargets = new Set(
      events
        .filter((event): event is Extract<RuntimeEvent, { type: "agent.handoff" }> => event.type === "agent.handoff")
        .flatMap((event) => [event.from, event.to]),
    );

    return crisisAgents.map((agent) => ({
      ...agent,
      status:
        eventAgentIds.has(agent.id) || handoffTargets.has(agent.id)
          ? ("active" as const)
          : ("standby" as const),
    }));
  }, [events]);
  const activeAgentCount = activeAgents.filter((agent) => agent.status === "active").length;
  const objectives = [
    cameraSignals.length > 0 ? "Verify visible ground truth before escalation" : null,
    hasMap ? "Compile operational map surface" : null,
    hasGate ? "Request human approval for public advisory" : null,
  ].filter(Boolean) as string[];

  if (!bootHoldComplete || !started || !hasAnyRuntimeEvent) {
    return (
      <BootSurface
        onRestart={() => {
          setBootHoldComplete(true);
          void startOrchestration();
        }}
      />
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        position: "relative",
        background: "#010407",
        overflow: "hidden",
        color: C.text,
      }}
    >
      <RuntimeHeader
        activeAgents={activeAgentCount}
        totalAgents={crisisAgents.length}
        status={hasGate ? "HITL REQUIRED" : generatedDockVisible ? "UI COMPILING" : "LISTENING"}
        latestEvent={latestEvent}
      />

      <main
        style={{
          height: "100%",
          display: "grid",
          gridTemplateColumns: generatedDockVisible
            ? `minmax(0, 1fr) ${dockWidth}px`
            : "minmax(0, 1fr) 0px",
          transition: "grid-template-columns 700ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <section style={{ position: "relative", minWidth: 0, minHeight: 0 }}>
          <MapCanvas
            mode="active"
            target={mapTarget}
            operatorTargets={operatorMapTargets}
            onOperatorTargetRequest={requestMapNavigation}
            chrome="minimal"
            framed={false}
            viewportPaddingRight={generatedDockVisible ? dockWidth + 70 : 40}
          />

          <SignalContextRail
            signalCount={signals.length}
            cameraCount={cameraSignals.length}
            latestEvent={latestEvent}
            objectives={objectives}
          />

          {cameraSignals.length > 0 ? (
            <div
              style={{
                position: "absolute",
                left: hasGate ? 316 : 28,
                bottom: 78,
                width: generatedDockVisible ? 356 : "min(760px, calc(100vw - 56px))",
                transform: generatedDockVisible ? "translateY(0)" : "translateY(0)",
                transition: "left 520ms ease, width 520ms ease, opacity 420ms ease",
                pointerEvents: "auto",
              }}
            >
              <VisualVerificationPanel cameraSignals={cameraSignals} compact={generatedDockVisible || hasGate} />
            </div>
          ) : null}

          <ProtocolTray eventCount={events.length} />
        </section>

        <aside
          style={{
            minWidth: 0,
            height: "100%",
            padding: generatedDockVisible ? "88px 18px 18px 0" : "88px 0 18px 0",
            opacity: generatedDockVisible ? 1 : 0,
            transform: generatedDockVisible ? "translateX(0)" : "translateX(34px)",
            transition:
              "opacity 480ms ease, transform 700ms cubic-bezier(0.22, 1, 0.36, 1), padding 520ms ease",
            pointerEvents: generatedDockVisible ? "auto" : "none",
          }}
        >
          <GeneratedSurfaceStack
            components={dockComponents}
            daytonaDone={hasDaytonaOutput}
            onApproveGate={approveGate}
            onRejectGate={rejectGate}
            onActionSelect={handleActionPlanAction}
            focusMode={focusMode}
            maxVisible={maxVisibleComponents}
          />
        </aside>
      </main>

      {pendingBroadcast ? (
        <XBroadcastGate
          component={pendingBroadcast}
          onAuthorize={() => authorizeBroadcast(pendingBroadcast)}
          onReject={() => dismissBroadcast(pendingBroadcast.props.actionId)}
        />
      ) : null}
    </div>
  );
}

function BootSurface({ onRestart }: { onRestart: () => void }) {
  return <LaunchScreen passive onActivate={onRestart} />;
}

function RuntimeHeader({
  activeAgents,
  totalAgents,
  status,
  latestEvent,
}: {
  activeAgents: number;
  totalAgents: number;
  status: string;
  latestEvent?: RuntimeEvent;
}) {
  return (
    <header
      style={{
        position: "absolute",
        top: 18,
        left: 22,
        right: 22,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          background: "rgba(1,5,9,0.72)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.34)",
          backdropFilter: "blur(20px)",
          padding: "12px 15px",
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 6 }}>
            CRISIS<span style={{ color: C.red }}>GRID</span>
          </div>
          <div style={{ marginTop: 3, color: C.muted, fontSize: 11, letterSpacing: 5 }}>
            RUNTIME
          </div>
        </div>
        <div
          style={{
            width: 1,
            alignSelf: "stretch",
            background: "rgba(255,255,255,0.12)",
          }}
        />
        <div>
          <div style={{ color: C.muted, fontSize: 10, textTransform: "uppercase" }}>
            Orchestrator
          </div>
          <div style={{ marginTop: 5, color: C.green, fontSize: 13, fontWeight: 900 }}>
            {status}
          </div>
        </div>
        <div>
          <div style={{ color: C.muted, fontSize: 10, textTransform: "uppercase" }}>
            Agent mesh
          </div>
          <div style={{ marginTop: 5, fontSize: 13, fontWeight: 900 }}>
            {activeAgents} / {totalAgents}
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 430,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          background: "rgba(1,5,9,0.66)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
          backdropFilter: "blur(20px)",
          padding: "11px 13px",
          textAlign: "right",
        }}
      >
        <div style={{ color: C.blue, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
          Latest runtime decision
        </div>
        <div style={{ marginTop: 6, color: C.text, fontSize: 12, lineHeight: 1.4 }}>
          {latestEvent ? describeRuntimeEvent(latestEvent) : "Listening for crisis signals."}
        </div>
      </div>
    </header>
  );
}

function SignalContextRail({
  signalCount,
  cameraCount,
  latestEvent,
  objectives,
}: {
  signalCount: number;
  cameraCount: number;
  latestEvent?: RuntimeEvent;
  objectives: string[];
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 28,
        top: 122,
        zIndex: 12,
        display: "grid",
        gap: 8,
        width: 268,
        pointerEvents: "none",
      }}
    >
      <MiniMetric
        icon={<Satellite size={16} />}
        label="Signals read"
        value={String(signalCount)}
        accent={C.blue}
      />
      <MiniMetric
        icon={<Eye size={16} />}
        label="Visual feeds"
        value={String(cameraCount)}
        accent={C.green}
      />
      {latestEvent ? (
        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            background: "rgba(1,5,9,0.62)",
            backdropFilter: "blur(16px)",
            padding: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.orange }}>
            <RadioTower size={15} />
            <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
              Runtime event
            </span>
          </div>
          <div style={{ marginTop: 7, color: "#cbd4df", fontSize: 11, lineHeight: 1.4 }}>
            {describeRuntimeEvent(latestEvent)}
          </div>
        </div>
      ) : null}
      {objectives.length > 0 ? (
        <div
          style={{
            border: `1px solid rgba(16,255,133,0.18)`,
            borderRadius: 8,
            background: "rgba(1,5,9,0.54)",
            backdropFilter: "blur(16px)",
            padding: 10,
            color: "#cbd4df",
            fontSize: 11,
            lineHeight: 1.45,
          }}
        >
          <div style={{ color: C.green, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
            Active intent
          </div>
          <div style={{ marginTop: 7 }}>{objectives[objectives.length - 1]}</div>
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        background: "rgba(1,5,9,0.58)",
        backdropFilter: "blur(16px)",
        padding: "9px 10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: accent }}>
        {icon}
        <span style={{ color: C.muted, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <strong style={{ color: C.text, fontSize: 14 }}>{value}</strong>
    </div>
  );
}

function ProtocolTray({
  eventCount,
}: {
  eventCount: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        right: 28,
        top: 122,
        zIndex: 12,
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        height: 34,
        border: `1px solid rgba(30,167,255,0.28)`,
        borderRadius: 9,
        background: "rgba(1,5,9,0.62)",
        backdropFilter: "blur(18px)",
        padding: "0 11px",
        opacity: 0.9,
        pointerEvents: "none",
      }}
    >
      <BrainCircuit size={15} color={C.blue} />
      <span style={{ color: C.blue, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
        CopilotKit / AG-UI / A2UI live
      </span>
      <span style={{ color: C.muted, fontSize: 10, fontWeight: 800 }}>
        {eventCount} events
      </span>
    </div>
  );
}

function XBroadcastGate({
  component,
  onAuthorize,
  onReject,
}: {
  component: PublicBroadcastComponent;
  onAuthorize: () => void;
  onReject: () => void;
}) {
  const characterCount = component.props.message.length;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 34,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(circle at 50% 50%, rgba(30,167,255,0.12), rgba(1,4,7,0.12) 34%, rgba(1,4,7,0.42) 100%)",
        pointerEvents: "none",
      }}
    >
      <section
        aria-label="Aprobacion de publicacion en X"
        style={{
          width: "min(590px, calc(100vw - 48px))",
          border: `1px solid rgba(30,167,255,0.42)`,
          borderRadius: 12,
          background: "linear-gradient(145deg, rgba(4,12,18,0.96), rgba(1,5,9,0.94))",
          boxShadow: "0 32px 110px rgba(0,0,0,0.68), 0 0 48px rgba(30,167,255,0.14)",
          color: C.text,
          overflow: "hidden",
          pointerEvents: "auto",
          backdropFilter: "blur(22px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 18,
            padding: "18px 20px 14px",
            borderBottom: `1px solid rgba(255,255,255,0.08)`,
          }}
        >
          <div style={{ display: "flex", gap: 13, minWidth: 0 }}>
            <span
              style={{
                width: 42,
                height: 42,
                display: "grid",
                placeItems: "center",
                borderRadius: 10,
                border: `1px solid rgba(30,167,255,0.34)`,
                background: "rgba(30,167,255,0.1)",
                color: C.blue,
                boxShadow: "0 0 28px rgba(30,167,255,0.16)",
                flex: "0 0 auto",
              }}
            >
              <Send size={19} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: C.blue, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
                gatekeeper_agent
              </div>
              <h2
                style={{
                  margin: "5px 0 0",
                  fontSize: 22,
                  lineHeight: 1.15,
                  fontWeight: 900,
                  letterSpacing: 0,
                }}
              >
                XBroadcast requiere autorizacion humana
              </h2>
            </div>
          </div>
          <div
            style={{
              border: `1px solid rgba(16,255,133,0.24)`,
              borderRadius: 999,
              color: C.green,
              fontSize: 10,
              fontWeight: 900,
              padding: "6px 9px",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            autonomous after approval
          </div>
        </div>

        <div style={{ padding: "16px 20px 0" }}>
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
            Por que te lo ofrezco
          </div>
          <p style={{ margin: "7px 0 0", color: "#cbd4df", fontSize: 13, lineHeight: 1.55 }}>
            CSN-style detecto un sismo relevante, las camaras cercanas ya estan verificando el corredor
            Vitacura-Costanera y redes sociales muestran preguntas sobre rutas. Publicar puede afectar
            movimiento publico, por eso el sistema no lo ejecuta sin aprobacion del operador.
          </p>
        </div>

        <div
          style={{
            margin: "16px 20px 0",
            padding: "15px 0 0",
            borderTop: `1px solid rgba(255,255,255,0.08)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                display: "grid",
                placeItems: "center",
                borderRadius: 999,
                background: "#f7f9fb",
                color: "#05070a",
                fontSize: 16,
                fontWeight: 950,
              }}
            >
              X
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <strong style={{ fontSize: 14 }}>CrisisGrid</strong>
                <BadgeCheck size={15} color={C.blue} />
              </div>
              <div style={{ color: C.muted, fontSize: 12 }}>
                {component.props.handle} · {component.props.audience}
              </div>
            </div>
          </div>

          <p style={{ margin: "13px 0 0", color: C.text, fontSize: 15, lineHeight: 1.48 }}>
            {component.props.message}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 12,
              color: C.muted,
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            <span>{characterCount}/280 chars</span>
            <span>{component.props.autonomy.replaceAll("_", " ")}</span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            padding: 20,
          }}
        >
          <button
            type="button"
            onClick={onReject}
            style={{
              height: 42,
              border: `1px solid rgba(255,255,255,0.18)`,
              borderRadius: 8,
              background: "rgba(255,255,255,0.045)",
              color: "#d6dde6",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            No autorizar
          </button>
          <button
            type="button"
            onClick={onAuthorize}
            style={{
              height: 42,
              border: `1px solid ${C.green}`,
              borderRadius: 8,
              background: "rgba(16,255,133,0.14)",
              color: C.text,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 900,
              textTransform: "uppercase",
              boxShadow: "0 0 24px rgba(16,255,133,0.12)",
            }}
          >
            Autorizar
          </button>
        </div>
      </section>
    </div>
  );
}

function shouldDockComponent(type: UiComponent["type"]) {
  return [
    "incident_card",
    "contradiction_panel",
    "resource_deployment_panel",
    "route_planner_panel",
    "action_plan_board",
    "public_alert_draft",
    "civic_gate",
    "tool_creation_panel",
  ].includes(type);
}

function describeRuntimeEvent(event: RuntimeEvent) {
  const agent = getCrisisAgent(event.agentId)?.label ?? event.agentId;

  switch (event.type) {
    case "signal.received":
      return `${agent} read ${event.signal.source}: ${event.signal.location}`;
    case "agent.handoff": {
      const from = getCrisisAgent(event.from)?.label ?? event.from;
      const to = getCrisisAgent(event.to)?.label ?? event.to;
      return `${from} -> ${to}: ${event.summary}`;
    }
    case "ui.component.added":
      return `${agent} rendered ${event.component.type}`;
    case "ui.component.updated":
      return `${agent} updated ${event.componentType}`;
    case "map.layer.added":
      return `${agent} added map layer: ${event.layer.label}`;
    case "tool.started":
      return `${agent} started ${event.toolName}`;
    case "tool.completed":
      return `${agent} completed ${event.toolId} on ${event.runtime}`;
    case "gate.required":
      return `${agent} requires approval: ${event.title}`;
    case "gate.approved":
      return `${agent} approved ${event.actionId}`;
  }
}

function VisualVerificationPanel({
  cameraSignals,
  compact = false,
}: {
  cameraSignals: Array<{ id: string; text: string; location: string; confidence: number }>;
  compact?: boolean;
}) {
  return (
    <section
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 9,
        background: "linear-gradient(135deg, rgba(4,12,18,0.9), rgba(1,6,10,0.86))",
        padding: 14,
        overflow: "hidden",
        boxShadow: "0 22px 70px rgba(0,0,0,0.42)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 36,
              height: 36,
              display: "grid",
              placeItems: "center",
              borderRadius: 8,
              color: C.green,
              background: "rgba(16,255,133,0.08)",
              boxShadow: "0 0 24px rgba(16,255,133,0.18)",
            }}
          >
            <Eye size={20} />
          </span>
          <div>
            <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>
              Camera Agent
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              Human visual verification layer
            </div>
          </div>
        </div>
        <div style={{ color: C.green, fontSize: 12, textTransform: "uppercase" }}>
          {cameraSignals.length}/3 nearby feeds
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        {cameraSignals.slice(0, compact ? 1 : 3).map((signal) => {
          const asset = cameraAssets[signal.id] ?? {
            src: "/camera-feeds/concepcion.jpg",
            kind: "image" as const,
          };

          return (
            <article
              key={signal.id}
              style={{
                position: "relative",
                minHeight: 104,
                border: `1px solid ${C.borderStrong}`,
                borderRadius: 8,
                overflow: "hidden",
                background: "#03080c",
              }}
            >
              {asset.kind === "video" ? (
                <video
                  src={asset.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-label={signal.location}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "grayscale(1) contrast(1.22) brightness(0.66)",
                  }}
                />
              ) : (
                <Image
                  src={asset.src}
                  alt={signal.location}
                  fill
                  loading="eager"
                  sizes="30vw"
                  style={{ objectFit: "cover", filter: "grayscale(1) contrast(1.18) brightness(0.64)" }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.78))",
                }}
              />
              <div style={{ position: "absolute", left: 10, right: 10, bottom: 9 }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
                  {signal.location}
                </div>
                <div style={{ marginTop: 4, color: "#c8d0da", fontSize: 11, lineHeight: 1.35 }}>
                  {signal.text}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function buildComponentsFromToolResult(result: ToolRunResponse): UiComponent[] {
  if (result.toolName === "navigate_map_to_target") {
    return [];
  }

  if (result.toolName === "publish_public_alert_mock") {
    return [
      {
        type: "public_alert_draft",
        props: {
          channel: String(result.output.channel ?? "X / @CrisisGridCL"),
          message: `Published mock: ${String(
            result.output.message ?? "Public advisory sent to Región Metropolitana.",
          )}`,
        },
      },
    ];
  }

  const riskZone = result.output.riskZone as
    | { center?: [number, number]; radiusMeters?: number; severity?: "critical"; reason?: string }
    | undefined;

  return [
    riskZone
      ? {
          type: "risk_zone_layer",
          props: {
            center: riskZone.center ?? [-70.5707, -33.3972],
            radiusMeters: riskZone.radiusMeters ?? 1800,
            severity: riskZone.severity ?? "critical",
            reason: riskZone.reason ?? "Daytona generated risk envelope",
          },
        }
      : null,
    {
      type: "action_plan_board",
      props: {
        actions: [
          {
            id: "verify-visual-ground-truth",
            title: "Verify camera evidence with operator",
            owner: "Camera Agent",
            status: "done",
          },
          {
            id: "inspect-critical-corridor",
            title: "Send inspection unit to Costanera corridor",
            owner: "Ops Lead",
            status: "running",
          },
          {
            id: "publish-alert",
            title: "Publish precautionary advisory",
            owner: "Civic Comms",
            status: "needs_approval",
          },
        ],
      },
    },
  ].filter(Boolean) as UiComponent[];
}

function buildLayersFromToolResult(
  result: ToolRunResponse,
): MapLayer[] {
  if (result.toolName === "navigate_map_to_target") {
    const mapNavigation = result.output.mapNavigation as
      | {
          label?: string;
          center?: [number, number];
          radiusMeters?: number;
          source?: string;
        }
      | undefined;

    return [
      {
        id: `operator-map-target-${Date.now()}`,
        label: mapNavigation?.label ?? "Operator map target",
        kind: "camera",
        severity: "high",
        data: {
          center: mapNavigation?.center,
          radiusMeters: mapNavigation?.radiusMeters,
          source: mapNavigation?.source ?? "operator_directive",
          runtime: result.runtime,
        },
      },
    ];
  }

  return [
    {
      id: "daytona-risk-envelope",
      label: "Daytona risk envelope",
      kind: "risk_zone",
      severity: "critical",
      data: result.output,
    },
  ];
}

function resolveMapTarget(
  components: UiComponent[],
  mapLayers: Array<{ label: string; data: unknown }>,
): MapTarget {
  const generatedMap = components
    .slice()
    .reverse()
    .find(
      (component): component is Extract<UiComponent, { type: "generated_map_surface" }> =>
        component.type === "generated_map_surface",
    );

  if (generatedMap) {
    return {
      center: generatedMap.props.center,
      radiusMeters: generatedMap.props.radiusMeters,
      label: generatedMap.props.label,
    };
  }

  const riskZone = components
    .slice()
    .reverse()
    .find(
      (component): component is Extract<UiComponent, { type: "risk_zone_layer" }> =>
        component.type === "risk_zone_layer",
    );

  if (riskZone) {
    return {
      center: riskZone.props.center,
      radiusMeters: riskZone.props.radiusMeters,
      label: riskZone.props.reason,
    };
  }

  const layerWithCenter = mapLayers
    .slice()
    .reverse()
    .find((layer) => hasMapCenter(layer.data));

  if (layerWithCenter && hasMapCenter(layerWithCenter.data)) {
    return {
      center: layerWithCenter.data.center,
      radiusMeters: layerWithCenter.data.radiusMeters,
      label: layerWithCenter.label,
    };
  }

  return {
    center: [-70.5707, -33.3972],
    radiusMeters: 1800,
    label: "Vitacura visual verification envelope",
  };
}

function hasMapCenter(value: unknown): value is {
  center: [number, number];
  radiusMeters?: number;
} {
  if (!value || typeof value !== "object" || !("center" in value)) {
    return false;
  }

  const center = (value as { center?: unknown }).center;

  return (
    Array.isArray(center) &&
    center.length === 2 &&
    typeof center[0] === "number" &&
    typeof center[1] === "number"
  );
}
