"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BadgeCheck, BrainCircuit, Eye, Mic, RadioTower, Satellite, Send, Volume2 } from "lucide-react";

import type { OrchestrationPlan } from "@/lib/agentic/orchestration";
import { crisisAgents, getCrisisAgent } from "@/lib/agentic/agents";
import type { UiComponent } from "@/lib/crisis/schemas";
import type { AgentId, MapLayer, RuntimeEvent } from "@/lib/runtime/events";
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
type EmergencyDispatchComponent = Extract<UiComponent, { type: "emergency_dispatch_panel" }>;
type CivicGateComponent = Extract<UiComponent, { type: "civic_gate" }>;
type ActionPlanComponent = Extract<UiComponent, { type: "action_plan_board" }>;
type ActionPlanAction = ActionPlanComponent["props"]["actions"][number];
type ActionPlanStatus = ActionPlanAction["status"];
type VoiceIntent = {
  kind:
    | "navigate_map"
    | "approve_public_alert"
    | "hold_public_alert"
    | "publish_x_alert"
    | "contact_emergency_services"
    | "summarize_status"
    | "noop";
  targetId?: OperatorMapTarget["id"];
  service?: EmergencyDispatchComponent["props"]["service"];
  priority?: EmergencyDispatchComponent["props"]["priority"];
  reason?: string;
  confidence: number;
};
type VoiceCommandResult = {
  intent: VoiceIntent;
  spokenResponse: string;
};
type OperatorScenario = {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  severity: "low" | "medium" | "high" | "critical";
  accent: string;
  agent: string;
  events: string[];
  recommendation: string;
};
type OperatorScenarioTemplate = Omit<OperatorScenario, "events"> & {
  timeline: string[];
  generatedComponents?: UiComponent[];
  signals: Array<{
    source: "camera" | "radio" | "citizen" | "traffic" | "sensor" | "social";
    text: string;
    confidence: number;
    location: string;
  }>;
};
type SpeechRecognitionResultEventLike = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
};
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

let runtimeEventSequence = 0;

function nextRuntimeEventId(prefix: string) {
  runtimeEventSequence += 1;
  return `${prefix}-${runtimeEventSequence}`;
}

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
  {
    id: "wildfire-valparaiso",
    label: "Valparaiso wildfire",
    source: "operator_directive",
    center: [-71.6127, -33.0472],
    radiusMeters: 2800,
  },
  {
    id: "volcano-villarrica",
    label: "Villarrica volcano",
    source: "operator_directive",
    center: [-71.9399, -39.4203],
    radiusMeters: 5200,
  },
  {
    id: "mudflow-maipo",
    label: "Cajon del Maipo aluvion",
    source: "operator_directive",
    center: [-70.3509, -33.5994],
    radiusMeters: 3600,
  },
  {
    id: "blackout-santiago",
    label: "Santiago blackout",
    source: "operator_directive",
    center: [-70.6693, -33.4489],
    radiusMeters: 3000,
  },
];

export default function CrisisGridRuntime() {
  const [started, setStarted] = useState(false);
  const [bootHoldComplete, setBootHoldComplete] = useState(false);
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useState<Set<string>>(() => new Set());
  const [handledGateActionIds, setHandledGateActionIds] = useState<Set<string>>(() => new Set());
  const [actionStatusOverrides, setActionStatusOverrides] = useState<Record<string, ActionPlanStatus>>({});
  const [operatorScenario, setOperatorScenario] = useState<OperatorScenario | null>(null);
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
    setOperatorScenario(null);
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
    const emergencyDispatch = components.find(
      (component): component is EmergencyDispatchComponent =>
        component.type === "emergency_dispatch_panel" &&
        component.props.actionId === actionId,
    );

    if (emergencyDispatch) {
      authorizeEmergencyDispatch(emergencyDispatch);
      return;
    }

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
        props: getApprovedGateDraft(actionId),
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
    const emergencyDispatch = components.find(
      (component): component is EmergencyDispatchComponent =>
        component.type === "emergency_dispatch_panel" &&
        component.props.actionId === actionId,
    );

    setHandledGateActionIds((current) => {
      const next = new Set(current);
      next.add(actionId);
      return next;
    });
    setActionStatus(actionId, "queued");

    if (emergencyDispatch) {
      dispatch({
        id: `evt-${actionId}-mock-dispatch-rejected`,
        type: "ui.component.added",
        timestamp: new Date().toISOString(),
        agentId: "gatekeeper_agent",
        component: {
          type: "public_alert_draft",
          props: {
            channel: "Operator decision",
            message:
              `Mock contact to ${emergencyDispatch.props.service} was not authorized. ` +
              "No real emergency service was contacted or dispatched.",
          },
        },
      });
      return;
    }

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

  function authorizeEmergencyDispatch(component: EmergencyDispatchComponent) {
    setHandledGateActionIds((current) => {
      const next = new Set(current);
      next.add(component.props.actionId);
      return next;
    });
    setActionStatus(component.props.actionId, "done");

    dispatch({
      id: `evt-${component.props.actionId}-approved`,
      type: "gate.approved",
      timestamp: new Date().toISOString(),
      agentId: "gatekeeper_agent",
      gateId: "emergency-dispatch-gate",
      actionId: component.props.actionId,
      approvedBy: "operator",
    });

    const event: Extract<RuntimeEvent, { type: "tool.started" }> = {
      id: `evt-${component.props.actionId}-started`,
      type: "tool.started",
      timestamp: new Date().toISOString(),
      agentId: "tool_execution_agent",
      toolId: component.props.actionId,
      toolName: "contact_emergency_services_mock",
      runtime: "daytona",
      input: {
        incidentType: "earthquake",
        location: component.props.location,
        service: component.props.service,
        reason: component.props.reason,
        priority: component.props.priority,
      },
    };

    dispatch(event);
    void runDaytonaTool(event);
  }

  function requestMapNavigation(target: OperatorMapTarget) {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    actionQueueRef.current = [];
    reset();
    setDismissedBroadcastIds(new Set());
    setHandledGateActionIds(new Set());
    setActionStatusOverrides({});

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
        type: "ui.component.added",
        timestamp: new Date().toISOString(),
        agentId: "orchestrator",
        component: {
          type: "generated_map_surface",
          props: {
            center: target.center,
            radiusMeters: target.radiusMeters,
            severity: target.id === "wildfire-valparaiso" || target.id === "mudflow-maipo" ? "critical" : "high",
            label: `${target.label} - operator-directed camera move`,
          },
        },
      });
    }, 520);

    activateOperatorScenario(target);
    void runDaytonaTool(event);
  }

  function activateOperatorScenario(target: OperatorMapTarget) {
    const template = getOperatorScenarioTemplate(target);
    setOperatorScenario({ ...template, events: [] });

    template.timeline.forEach((timelineEvent, index) => {
      const timer = window.setTimeout(() => {
        setOperatorScenario((current) =>
          current?.id === template.id
            ? { ...current, events: [...current.events, timelineEvent] }
            : current,
        );

        const signal = template.signals[index];
        if (signal) {
          dispatch({
            id: nextRuntimeEventId(`evt-${template.id}-signal`),
            type: "signal.received",
            timestamp: new Date().toISOString(),
            agentId: resolveOperatorScenarioAgent(target),
            signal: {
              id: nextRuntimeEventId(`${template.id}-signal`),
              ...signal,
              receivedAt: new Date().toISOString(),
            },
          });
        }
      }, 420 + index * 1050);

      timersRef.current.push(timer);
    });

    const traceTimer = window.setTimeout(() => {
      dispatch({
        id: nextRuntimeEventId(`evt-${template.id}-central-surface`),
        type: "ui.component.added",
        timestamp: new Date().toISOString(),
        agentId: "ui_planner_agent",
        component: {
          type: "agent_trace_timeline",
          props: {
            events: template.timeline.map((event, index) => ({
              label: `${template.location} ${index + 1}`,
              detail: event,
            })),
          },
        },
      });
    }, 1850);

    timersRef.current.push(traceTimer);

    template.generatedComponents?.forEach((component, index) => {
      const componentTimer = window.setTimeout(() => {
        dispatch({
          id: nextRuntimeEventId(`evt-${template.id}-${component.type}`),
          type: "ui.component.added",
          timestamp: new Date().toISOString(),
          agentId: "ui_planner_agent",
          component,
        });
      }, 2600 + index * 980);

      timersRef.current.push(componentTimer);
    });
  }

  async function handleVoiceCommand(transcript: string) {
    const response = await fetch("/api/agent/voice-command", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        transcript,
        context: {
          latestEvent: latestEvent ? describeRuntimeEvent(latestEvent) : null,
          activeObjectives: objectives,
          pendingGate: activeCivicGates[0]?.props.title ?? null,
          pendingBroadcast: pendingBroadcast?.props.message ?? null,
          emergencyDispatches: activeEmergencyDispatches.map((component) => ({
            service: component.props.service,
            location: component.props.location,
            priority: component.props.priority,
          })),
        },
      }),
    });
    const result = (await response.json()) as VoiceCommandResult;

    dispatch({
      id: nextRuntimeEventId("evt-voice-command"),
      type: "ui.component.added",
      timestamp: new Date().toISOString(),
      agentId: "orchestrator",
      component: {
        type: "agent_trace_timeline",
        props: {
          events: [
            { label: "Operator voice", detail: transcript },
            {
              label: "Gemini intent",
              detail: `${result.intent.kind} / ${Math.round(result.intent.confidence * 100)}%`,
            },
          ],
        },
      },
    });

    executeVoiceIntent(result.intent);

    return result.spokenResponse;
  }

  function executeVoiceIntent(intent: VoiceIntent) {
    switch (intent.kind) {
      case "navigate_map": {
        const target =
          operatorMapTargets.find((mapTarget) => mapTarget.id === intent.targetId) ??
          operatorMapTargets[0];
        requestMapNavigation(target);
        return;
      }

      case "approve_public_alert":
        approveGate("publish-alert");
        return;

      case "hold_public_alert":
        rejectGate("publish-alert");
        return;

      case "publish_x_alert":
        if (pendingBroadcast) {
          authorizeBroadcast(pendingBroadcast);
        }
        return;

      case "contact_emergency_services":
        dispatch({
          id: nextRuntimeEventId("evt-voice-emergency-dispatch"),
          type: "ui.component.added",
          timestamp: new Date().toISOString(),
          agentId: "gatekeeper_agent",
          component: {
            type: "emergency_dispatch_panel",
            props: {
              service: intent.service ?? "SENAPRED",
              reason: intent.reason ?? "Operator voice request during seismic verification",
              location: "Vitacura-Costanera corridor",
              priority: intent.priority ?? "high",
              actionId: nextRuntimeEventId("voice-emergency"),
              approvalLabel: "Authorize mock contact",
            },
          },
        });
        return;

      case "summarize_status":
      case "noop":
        return;
    }
  }

  const cameraSignals = signals.filter((signal) => signal.source === "camera");
  const hasAnyRuntimeEvent = events.length > 0;
  const hasMap = components.some((component) => component.type === "generated_map_surface") || mapLayers.length > 0;
  const activeCivicGates = components.filter(
    (component): component is CivicGateComponent =>
      component.type === "civic_gate" &&
      !handledGateActionIds.has(component.props.actionId),
  );
  const pendingBroadcast = components.find(
    (component): component is PublicBroadcastComponent =>
      component.type === "public_broadcast_panel" &&
      !dismissedBroadcastIds.has(component.props.actionId),
  );
  const activeEmergencyDispatches = components.filter(
    (component): component is EmergencyDispatchComponent =>
      component.type === "emergency_dispatch_panel" &&
      !handledGateActionIds.has(component.props.actionId),
  );
  const dockComponents = components
    .filter((component) => component.type !== "public_broadcast_panel")
    .filter(
      (component) =>
        component.type !== "emergency_dispatch_panel" ||
        !handledGateActionIds.has(component.props.actionId),
    )
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
    });
  const hasGate =
    activeCivicGates.length > 0 ||
    activeEmergencyDispatches.length > 0 ||
    Boolean(pendingBroadcast) ||
    Object.entries(gates).some(
      ([gateId, status]) =>
        status === "required" &&
        gateId !== "public-alert-gate" &&
        gateId !== "emergency-dispatch-gate",
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
    activeEmergencyDispatches.length > 0 ? "Approve or stop mock emergency-service contact" : null,
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
                left: hasGate ? 304 : 28,
                bottom: 78,
                width: generatedDockVisible
                  ? "min(620px, calc(100vw - 430px))"
                  : "min(920px, calc(100vw - 56px))",
                transform: generatedDockVisible ? "translateY(0)" : "translateY(0)",
                transition: "left 520ms ease, width 520ms ease, opacity 420ms ease",
                pointerEvents: "auto",
              }}
            >
              <VisualVerificationPanel cameraSignals={cameraSignals} compact={hasGate} />
            </div>
          ) : null}

          <ProtocolTray eventCount={events.length} />
          <OperatorVoiceControl onCommand={handleVoiceCommand} />
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

      {operatorScenario ? (
        <OperatorScenarioSurface
          scenario={operatorScenario}
          onClose={() => setOperatorScenario(null)}
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

function OperatorVoiceControl({
  onCommand,
}: {
  onCommand: (transcript: string) => Promise<string>;
}) {
  const [state, setState] = useState<"idle" | "listening" | "processing">("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("Push to talk with CrisisGrid");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-CL";
    utterance.rate = 0.98;
    window.speechSynthesis.speak(utterance);
  }

  async function submitTranscript(nextTranscript: string) {
    const trimmedTranscript = nextTranscript.trim();
    if (!trimmedTranscript) {
      setState("idle");
      return;
    }

    setTranscript(trimmedTranscript);
    setState("processing");

    try {
      const spokenResponse = await onCommand(trimmedTranscript);
      setResponse(spokenResponse);
      speak(spokenResponse);
    } catch {
      const fallback = "No pude procesar la instruccion de voz. Mantengo el runtime activo.";
      setResponse(fallback);
      speak(fallback);
    } finally {
      setState("idle");
    }
  }

  function startListening() {
    if (state !== "idle") {
      recognitionRef.current?.stop();
      setState("idle");
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const typedCommand = window.prompt("Instruccion de operador para CrisisGrid");
      if (typedCommand) {
        void submitTranscript(typedCommand);
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-CL";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const finalTranscript = event.results[0]?.[0]?.transcript ?? "";
      void submitTranscript(finalTranscript);
    };
    recognition.onerror = () => {
      setResponse("No pude escuchar la instruccion. Intenta de nuevo.");
      setState("idle");
    };
    recognition.onend = () => {
      setState((current) => (current === "listening" ? "idle" : current));
    };

    recognitionRef.current = recognition;
    setResponse("Escuchando instruccion del operador...");
    setState("listening");
    recognition.start();
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 28,
        bottom: 24,
        zIndex: 19,
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr)",
        alignItems: "center",
        gap: 10,
        width: "min(510px, calc(100vw - 56px))",
        border: `1px solid ${state === "listening" ? C.green : "rgba(30,167,255,0.28)"}`,
        borderRadius: 11,
        background: "rgba(1,5,9,0.76)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.34)",
        backdropFilter: "blur(18px)",
        padding: 10,
      }}
    >
      <button
        type="button"
        onClick={startListening}
        style={{
          width: 42,
          height: 42,
          display: "grid",
          placeItems: "center",
          border: `1px solid ${state === "listening" ? C.green : C.blue}`,
          borderRadius: 10,
          background: state === "listening" ? "rgba(16,255,133,0.14)" : "rgba(30,167,255,0.12)",
          color: C.text,
          cursor: "pointer",
          boxShadow: state === "listening" ? "0 0 28px rgba(16,255,133,0.22)" : "none",
        }}
        aria-label="Operator voice command"
      >
        {state === "processing" ? <Volume2 size={18} /> : <Mic size={18} />}
      </button>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: state === "listening" ? C.green : C.blue, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
          Gemini operator voice
        </div>
        <div style={{ marginTop: 4, color: C.text, fontSize: 12, lineHeight: 1.35 }}>
          {response}
        </div>
        {transcript ? (
          <div style={{ marginTop: 3, color: C.muted, fontSize: 11, lineHeight: 1.35 }}>
            &quot;{transcript}&quot;
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OperatorScenarioSurface({
  scenario,
  onClose,
}: {
  scenario: OperatorScenario;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 31,
        display: "grid",
        placeItems: "center",
        padding: 24,
        pointerEvents: "none",
        background:
          "radial-gradient(circle at 50% 52%, rgba(16,255,133,0.08), rgba(1,4,7,0.12) 36%, rgba(1,4,7,0.28) 100%)",
      }}
    >
      <section
        style={{
          width: "min(660px, calc(100vw - 48px))",
          border: `1px solid ${scenario.accent}`,
          borderRadius: 12,
          background: "linear-gradient(145deg, rgba(4,12,18,0.96), rgba(1,5,9,0.93))",
          boxShadow: `0 32px 110px rgba(0,0,0,0.64), 0 0 46px ${scenario.accent}24`,
          color: C.text,
          overflow: "hidden",
          pointerEvents: "auto",
          backdropFilter: "blur(22px)",
          animation: "surfaceIn 360ms ease both",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            padding: "18px 20px 14px",
            borderBottom: `1px solid rgba(255,255,255,0.08)`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ color: scenario.accent, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
              {scenario.agent}
            </div>
            <h2 style={{ margin: "6px 0 0", fontSize: 23, lineHeight: 1.14, fontWeight: 900 }}>
              {scenario.title}
            </h2>
            <div style={{ marginTop: 7, color: C.muted, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
              {scenario.location} / {scenario.severity}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              border: `1px solid rgba(255,255,255,0.18)`,
              borderRadius: 8,
              background: "rgba(255,255,255,0.045)",
              color: C.text,
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            X
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <p style={{ margin: 0, color: "#cbd4df", fontSize: 13, lineHeight: 1.55 }}>
            {scenario.subtitle}
          </p>

          <div style={{ display: "grid", gap: 9, marginTop: 16 }}>
            {scenario.events.length === 0 ? (
              <div
                style={{
                  border: `1px dashed rgba(255,255,255,0.18)`,
                  borderRadius: 8,
                  padding: 12,
                  color: C.muted,
                  fontSize: 12,
                }}
              >
                Orchestrator is compiling the location-specific interface...
              </div>
            ) : (
              scenario.events.map((event, index) => (
                <div
                  key={`${scenario.id}-${event}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr",
                    gap: 10,
                    alignItems: "start",
                    border: `1px solid rgba(255,255,255,0.1)`,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.035)",
                    padding: 10,
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 999,
                      border: `1px solid ${scenario.accent}`,
                      color: scenario.accent,
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span style={{ color: C.text, fontSize: 12, lineHeight: 1.45 }}>
                    {event}
                  </span>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              marginTop: 16,
              border: `1px solid ${scenario.accent}55`,
              borderRadius: 9,
              background: `${scenario.accent}12`,
              color: C.text,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: scenario.accent, textTransform: "uppercase" }}>Recommendation: </strong>
            {scenario.recommendation}
          </div>
        </div>
      </section>
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
    "emergency_dispatch_panel",
    "tool_creation_panel",
  ].includes(type);
}

function resolveOperatorScenarioAgent(target: OperatorMapTarget): AgentId {
  if (target.id === "shoa-valparaiso") {
    return "public_api_sensor_agent";
  }

  if (
    target.id === "conaf-metropolitano" ||
    target.id === "wildfire-valparaiso" ||
    target.id === "volcano-villarrica" ||
    target.id === "mudflow-maipo"
  ) {
    return "disaster_physics_agent";
  }

  if (target.id === "blackout-santiago") {
    return "orchestrator";
  }

  return "camera_agent";
}

function getApprovedGateDraft(actionId: string): Extract<UiComponent, { type: "public_alert_draft" }>["props"] {
  if (actionId === "hold-valparaiso-evacuation-copy") {
    return {
      channel: "SHOA / municipal watch",
      message:
        "Operator confirmed coastal watch mode for Valparaiso. CrisisGrid continues monitoring SHOA-style thresholds, port cameras and evacuation-route congestion without issuing evacuation wording.",
    };
  }

  if (actionId === "approve-maipo-evacuation-watch") {
    return {
      channel: "SENAPRED / Maipo basin watch",
      message:
        "Evacuation watch approved for Cajon del Maipo. Keep Camino al Volcan clear, avoid bridge approaches and wait for official instructions before moving.",
    };
  }

  return {
    channel: "SENAPRED / municipal advisory",
    message:
      "Precautionary advisory: avoid the Vitacura-Costanera corridor while inspection teams verify seismic impact. Keep routes clear for emergency vehicles.",
  };
}

function getOperatorScenarioTemplate(target: OperatorMapTarget): OperatorScenarioTemplate {
  if (target.id === "shoa-valparaiso") {
    return {
      id: "shoa-valparaiso",
      title: "SHOA coastal protocol generated",
      subtitle:
        "The operator selected the Valparaiso coast. CrisisGrid pivots from urban earthquake verification into coastal tsunami-readiness and evacuation-route monitoring.",
      location: "Valparaiso / central coast",
      severity: "medium",
      accent: C.blue,
      agent: "public_api_sensor_agent",
      recommendation:
        "Keep the coastal advisory in watch mode. No evacuation order is suggested unless SHOA threshold or repeated port-camera evidence changes.",
      timeline: [
        "SHOA/DMC adapter checks central-coast threshold and tide conditions.",
        "Port and coastal cameras are prioritized over Vitacura corridor feeds.",
        "UI Planner prepares coastal route, port access and public watch surfaces.",
        "Gatekeeper holds evacuation copy until institutional threshold changes.",
      ],
      generatedComponents: [
        {
          type: "route_planner_panel",
          props: {
            routes: [
              { id: "valpo-av-errazuriz", label: "Av. Errazuriz coastal exit", status: "restricted", etaMinutes: 11 },
              { id: "valpo-avenida-argentina", label: "Avenida Argentina inland route", status: "open", etaMinutes: 8 },
              { id: "valpo-port-access", label: "Port access perimeter", status: "unknown" },
            ],
          },
        },
        {
          type: "public_alert_draft",
          props: {
            channel: "SHOA / municipal watch draft",
            message:
              "Monitoreo preventivo en borde costero de Valparaiso. No hay orden de evacuacion; mantente atento a canales oficiales y despeja accesos portuarios.",
          },
        },
        {
          type: "civic_gate",
          props: {
            title: "Hold coastal evacuation wording",
            risk: "Evacuation language can trigger unnecessary movement unless SHOA threshold or camera evidence changes.",
            actionId: "hold-valparaiso-evacuation-copy",
            approvalLabel: "Confirm watch mode",
          },
        },
      ],
      signals: [
        {
          source: "sensor",
          text: "SHOA-style check: no tsunami evacuation threshold crossed for central coast.",
          confidence: 0.76,
          location: "Valparaiso / central coast",
        },
        {
          source: "camera",
          text: "Port camera sweep requested; no abnormal coastal retreat visible in available feeds.",
          confidence: 0.64,
          location: "Muelle Prat / Valparaiso",
        },
        {
          source: "traffic",
          text: "Coastal evacuation routes remain open; congestion building near port access.",
          confidence: 0.69,
          location: "Avenida Errazuriz / Valparaiso",
        },
        {
          source: "social",
          text: "Repeated citizen questions about tsunami risk detected, but no confirmed evacuation instruction.",
          confidence: 0.58,
          location: "Valparaiso social stream",
        },
      ],
    };
  }

  if (target.id === "conaf-metropolitano") {
    return {
      id: "conaf-metropolitano",
      title: "CONAF wildfire surface generated",
      subtitle:
        "The operator selected the Cerro San Cristobal corridor. CrisisGrid swaps the earthquake surface for wildfire spread, wind and evacuation staging.",
      location: "Cerro San Cristobal / RM",
      severity: "high",
      accent: C.orange,
      agent: "disaster_physics_agent",
      recommendation:
        "Stage Bomberos/CONAF contact as mock HITL and keep wind direction visible before issuing neighborhood guidance.",
      timeline: [
        "CONAF/NASA adapter checks heat signature and smoke-column assumptions.",
        "Open-Meteo wind layer is requested for hill-to-neighborhood spread.",
        "Camera agent reprioritizes smoke-facing cameras near Pedro de Valdivia Norte.",
        "Gatekeeper prepares emergency-service contact gate without real dispatch.",
      ],
      generatedComponents: [
        {
          type: "risk_zone_layer",
          props: {
            center: target.center,
            radiusMeters: 2100,
            severity: "high",
            reason: "Hill-interface wildfire watch: wind drift can push smoke toward dense residential streets.",
          },
        },
        {
          type: "emergency_dispatch_panel",
          props: {
            service: "Bomberos",
            reason: "Prepare mock contact for smoke verification and hill-access staging near Cerro San Cristobal.",
            location: "Pedro de Valdivia Norte / Cerro San Cristobal",
            priority: "high",
            actionId: "dispatch-bomberos-san-cristobal-mock",
            approvalLabel: "Authorize mock contact",
          },
        },
      ],
      signals: [
        {
          source: "sensor",
          text: "CONAF-style wildfire watch: smoke column possible near urban hill interface.",
          confidence: 0.71,
          location: "Cerro San Cristobal",
        },
        {
          source: "sensor",
          text: "Open-Meteo wind check: south-west drift could push smoke toward residential streets.",
          confidence: 0.68,
          location: "Providencia / Recoleta",
        },
        {
          source: "camera",
          text: "Camera verification requested for smoke visibility and access-road obstruction.",
          confidence: 0.63,
          location: "Pedro de Valdivia Norte",
        },
        {
          source: "radio",
          text: "Ops channel suggests staging a mock Bomberos contact pending visual confirmation.",
          confidence: 0.66,
          location: "Metropolitan response net",
        },
      ],
    };
  }

  if (target.id === "wildfire-valparaiso") {
    return {
      id: "wildfire-valparaiso",
      title: "Valparaiso wildfire interface compiled",
      subtitle:
        "The operator selected a hill-interface fire. CrisisGrid switches from seismic verification into wind, route and evacuation staging.",
      location: "Valparaiso hills / Camino La Polvora",
      severity: "critical",
      accent: C.orange,
      agent: "disaster_physics_agent",
      recommendation:
        "Prioritize wind-driven spread, keep road closures visible and require operator approval before mock Bomberos contact or public guidance.",
      timeline: [
        "CONAF/NASA adapter flags a thermal anomaly near the hill interface.",
        "Open-Meteo wind pull changes the risk envelope toward inhabited slopes.",
        "Social Signal Agent detects repeated smoke reports and route questions.",
        "UI Planner replaces the seismic surface with fire perimeter, routes and dispatch gate.",
      ],
      generatedComponents: [
        {
          type: "risk_zone_layer",
          props: {
            center: target.center,
            radiusMeters: 2800,
            severity: "critical",
            reason: "Wind-driven fire envelope: hill terrain can push smoke and flame fronts toward evacuation corridors.",
          },
        },
        {
          type: "route_planner_panel",
          props: {
            routes: [
              { id: "valpo-la-polvora", label: "Camino La Polvora", status: "restricted", etaMinutes: 14 },
              { id: "valpo-agua-santa", label: "Agua Santa evacuation descent", status: "open", etaMinutes: 9 },
              { id: "valpo-avenida-alemania", label: "Avenida Alemania upper access", status: "unknown" },
            ],
          },
        },
        {
          type: "emergency_dispatch_panel",
          props: {
            service: "Bomberos",
            reason: "Mock escalation for hill-interface smoke column and evacuation-route staging in Valparaiso.",
            location: "Valparaiso hills / Camino La Polvora",
            priority: "critical",
            actionId: "dispatch-bomberos-valparaiso-mock",
            approvalLabel: "Authorize mock contact",
          },
        },
      ],
      signals: [
        {
          source: "sensor",
          text: "CONAF/NASA-style thermal anomaly detected near Valparaiso hill interface.",
          confidence: 0.78,
          location: "Camino La Polvora / Valparaiso",
        },
        {
          source: "sensor",
          text: "Open-Meteo wind check: gusts increase spread risk toward upper residential slopes.",
          confidence: 0.72,
          location: "Valparaiso ridge line",
        },
        {
          source: "social",
          text: "Repeated citizen posts mention smoke smell and questions about which descent route is open.",
          confidence: 0.63,
          location: "Valparaiso social stream",
        },
        {
          source: "traffic",
          text: "Route planner marks Camino La Polvora as restricted and keeps Agua Santa as primary descent.",
          confidence: 0.69,
          location: "Valparaiso access roads",
        },
      ],
    };
  }

  if (target.id === "volcano-villarrica") {
    return {
      id: "volcano-villarrica",
      title: "Villarrica volcanic watch generated",
      subtitle:
        "The operator selected Villarrica. CrisisGrid compiles a volcanic surface: ash dispersion, lake access, respiratory guidance and SENAPRED gate.",
      location: "Volcan Villarrica / Pucon",
      severity: "high",
      accent: C.red,
      agent: "disaster_physics_agent",
      recommendation:
        "Treat this as a watch surface: verify ash evidence, keep respiratory guidance drafted and contact SENAPRED only through the mock approval gate.",
      timeline: [
        "SERNAGEOMIN-style tremor signal enters the shared incident state.",
        "Open-Meteo wind vector is used to orient ash-dispersion risk.",
        "Camera Agent requests lake-facing and volcano-facing visual checks.",
        "Gatekeeper prepares SENAPRED mock contact and keeps public instructions gated.",
      ],
      generatedComponents: [
        {
          type: "risk_zone_layer",
          props: {
            center: target.center,
            radiusMeters: 5200,
            severity: "high",
            reason: "Volcanic ash watch: wind direction can shift respiratory and road-risk zones within minutes.",
          },
        },
        {
          type: "public_alert_draft",
          props: {
            channel: "SENAPRED volcanic watch draft",
            message:
              "Monitoreo preventivo por actividad volcanica en Villarrica. Evita acercarte al crater, protege vias respiratorias si observas ceniza y sigue canales oficiales.",
          },
        },
        {
          type: "emergency_dispatch_panel",
          props: {
            service: "SENAPRED",
            reason: "Mock coordination request for volcanic watch, ash-dispersion review and municipal readiness.",
            location: "Pucon / Volcan Villarrica",
            priority: "high",
            actionId: "dispatch-senapred-villarrica-mock",
            approvalLabel: "Authorize mock contact",
          },
        },
      ],
      signals: [
        {
          source: "sensor",
          text: "SERNAGEOMIN-style volcanic tremor signal rose above watch baseline.",
          confidence: 0.74,
          location: "Volcan Villarrica",
        },
        {
          source: "sensor",
          text: "Open-Meteo wind vector suggests potential ash drift toward Pucon lakefront.",
          confidence: 0.67,
          location: "Pucon / Villarrica basin",
        },
        {
          source: "camera",
          text: "Volcano-facing visual check requested; available cameras show intermittent cloud cover.",
          confidence: 0.58,
          location: "Pucon camera ring",
        },
        {
          source: "citizen",
          text: "Citizen reports mention light ash smell, unconfirmed and geographically sparse.",
          confidence: 0.49,
          location: "Pucon social reports",
        },
      ],
    };
  }

  if (target.id === "mudflow-maipo") {
    return {
      id: "mudflow-maipo",
      title: "Maipo aluvion surface generated",
      subtitle:
        "The operator selected Cajon del Maipo. CrisisGrid changes into rainfall, river-gauge, road-cut and basin-evacuation workflow.",
      location: "Cajon del Maipo / Rio Maipo",
      severity: "critical",
      accent: C.amber,
      agent: "disaster_physics_agent",
      recommendation:
        "Keep basin evacuation watch ready, route MOP and Carabineros to cutoffs, and avoid public movement until gauge/camera evidence confirms the flow.",
      timeline: [
        "DMC-style rainfall pulse is merged with river-gauge trend.",
        "Road agent marks Camino al Volcan and bridge crossings as fragile links.",
        "Camera Agent searches for water color, debris and road shoulder erosion.",
        "UI Planner generates basin routes, resource staging and evacuation-watch gate.",
      ],
      generatedComponents: [
        {
          type: "route_planner_panel",
          props: {
            routes: [
              { id: "maipo-camino-volcan", label: "Camino al Volcan", status: "restricted", etaMinutes: 18 },
              { id: "maipo-san-gabriel", label: "San Gabriel bridge approach", status: "unknown" },
              { id: "maipo-las-vertientes", label: "Las Vertientes descent", status: "open", etaMinutes: 12 },
            ],
          },
        },
        {
          type: "resource_deployment_panel",
          props: {
            resources: [
              { id: "mop-road-crew", label: "MOP road crew", status: "staging" },
              { id: "carabineros-cutoff", label: "Carabineros traffic cutoff", status: "staging" },
              { id: "samu-maipo", label: "SAMU Maipo standby", status: "available" },
            ],
          },
        },
        {
          type: "civic_gate",
          props: {
            title: "Approve basin evacuation watch",
            risk: "A basin-wide message can trigger road movement into fragile bridges unless the operator confirms the wording.",
            actionId: "approve-maipo-evacuation-watch",
            approvalLabel: "Approve watch",
          },
        },
      ],
      signals: [
        {
          source: "sensor",
          text: "DMC-style rainfall pulse exceeds Maipo basin watch threshold.",
          confidence: 0.77,
          location: "Rio Maipo upper basin",
        },
        {
          source: "traffic",
          text: "Camino al Volcan shows slowdown and possible shoulder erosion near bridge access.",
          confidence: 0.66,
          location: "San Jose de Maipo",
        },
        {
          source: "camera",
          text: "Camera sweep requested for water color, debris load and visible road obstruction.",
          confidence: 0.61,
          location: "San Gabriel bridge approach",
        },
        {
          source: "radio",
          text: "Field radio requests Carabineros cutoff plan, pending visual confirmation.",
          confidence: 0.7,
          location: "Cajon del Maipo response net",
        },
      ],
    };
  }

  if (target.id === "blackout-santiago") {
    return {
      id: "blackout-santiago",
      title: "Santiago blackout workflow compiled",
      subtitle:
        "The operator selected a power outage. CrisisGrid switches into urban continuity: intersections, hospitals, transport disruption and public comms.",
      location: "Santiago Centro / RM",
      severity: "medium",
      accent: C.violet,
      agent: "orchestrator",
      recommendation:
        "Prioritize traffic-light failures and critical facilities. Offer X guidance only after the operator approves autonomous publication.",
      timeline: [
        "Grid outage report enters the orchestrator as a non-geological cascading event.",
        "Traffic Agent marks signalized intersections as operational risk, not structural collapse.",
        "Social Signal Agent clusters citizen reports of metro delays and dark intersections.",
        "Gatekeeper offers an autonomous X update with explicit operator approval.",
      ],
      generatedComponents: [
        {
          type: "action_plan_board",
          props: {
            actions: [
              { id: "verify-substation-blackout", title: "Verify outage footprint with utility feed", owner: "Sensor Agent", status: "running" },
              { id: "stage-traffic-support", title: "Stage traffic support at dark intersections", owner: "Ops Lead", status: "queued" },
              { id: "draft-blackout-public-comms", title: "Prepare public mobility advisory", owner: "Civic Comms", status: "done" },
            ],
          },
        },
        {
          type: "public_broadcast_panel",
          props: {
            channel: "x_twitter",
            audience: "Santiago Centro",
            handle: "@CrisisGridCL",
            message:
              "Corte de energia reportado en sectores de Santiago Centro. Conduce con precaucion en cruces sin semaforo, evita desplazamientos no esenciales y sigue canales oficiales.",
            autonomy: "autonomous_after_approval",
            actionId: "publish-x-blackout-santiago",
            approvalLabel: "Authorize X post",
          },
        },
        {
          type: "emergency_dispatch_panel",
          props: {
            service: "Carabineros",
            reason: "Mock coordination request for intersections without traffic lights and pedestrian-risk control.",
            location: "Santiago Centro",
            priority: "medium",
            actionId: "dispatch-carabineros-blackout-mock",
            approvalLabel: "Authorize mock contact",
          },
        },
      ],
      signals: [
        {
          source: "sensor",
          text: "Grid-style outage footprint detected across central Santiago feeders.",
          confidence: 0.73,
          location: "Santiago Centro",
        },
        {
          source: "traffic",
          text: "Traffic lights degraded near Alameda and key north-south intersections.",
          confidence: 0.69,
          location: "Alameda / Santiago Centro",
        },
        {
          source: "social",
          text: "Citizen reports cluster around metro delays, dark intersections and elevator stoppages.",
          confidence: 0.65,
          location: "Región Metropolitana social stream",
        },
        {
          source: "radio",
          text: "Hospital backup-power check requested before issuing broad mobility guidance.",
          confidence: 0.62,
          location: "RM continuity net",
        },
      ],
    };
  }

  return {
    id: "costanera-vitacura",
    title: "Vitacura seismic verification regenerated",
    subtitle:
      "The operator returned to the seismic corridor. CrisisGrid recenters visual verification, inspection routing and public-advisory gating.",
    location: "Vitacura / Costanera",
    severity: "high",
    accent: C.green,
    agent: "camera_agent",
    recommendation:
      "Verify visible ground truth before escalating public guidance. Use CivicGate for public advisory or emergency-service mock contact.",
    timeline: [
      "CSN-style seismic incident remains the active parent event.",
      "Nearby Costanera cameras are pulled back into the center of the workflow.",
      "Inspection route is recalculated around congestion and bridge-access uncertainty.",
      "UI Planner restores public advisory and dispatch gates for operator approval.",
    ],
    signals: [
      {
        source: "sensor",
        text: "CSN-style seismic signal still relevant for Vitacura-Costanera corridor.",
        confidence: 0.82,
        location: "Vitacura / Costanera",
      },
      {
        source: "camera",
        text: "Costanera feed shows congestion and shaking evidence; no visible collapse confirmed.",
        confidence: 0.74,
        location: "Costanera Norte access",
      },
      {
        source: "traffic",
        text: "Route planner detects slowdown on Costanera corridor and recommends inspection staging.",
        confidence: 0.7,
        location: "Avenida Kennedy / Costanera",
      },
      {
        source: "social",
        text: "Citizen reports ask whether to avoid Vitacura-Costanera; public guidance remains gated.",
        confidence: 0.59,
        location: "Región Metropolitana",
      },
    ],
  };
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
  const visibleSignals = cameraSignals.slice(0, compact ? 1 : 3);
  const heroSignal =
    visibleSignals.find((signal) => cameraAssets[signal.id]?.kind === "video") ??
    visibleSignals[0];
  const secondarySignals = visibleSignals.filter((signal) => signal.id !== heroSignal?.id);

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
          gridTemplateColumns: compact ? "1fr" : "minmax(0, 2.25fr) minmax(190px, 1fr)",
          gap: 10,
          marginTop: 14,
        }}
      >
        {heroSignal ? (
          <CameraFeedCard signal={heroSignal} size="hero" />
        ) : null}
        {!compact && secondarySignals.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {secondarySignals.map((signal) => (
              <CameraFeedCard key={signal.id} signal={signal} size="small" />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CameraFeedCard({
  signal,
  size,
}: {
  signal: { id: string; text: string; location: string; confidence: number };
  size: "hero" | "small";
}) {
  const asset = cameraAssets[signal.id] ?? {
    src: "/camera-feeds/concepcion.jpg",
    kind: "image" as const,
  };
  const isHero = size === "hero";

  return (
    <article
      style={{
        position: "relative",
        minHeight: isHero ? 282 : 136,
        border: `1px solid ${isHero ? "rgba(16,255,133,0.44)" : C.borderStrong}`,
        borderRadius: 8,
        overflow: "hidden",
        background: "#03080c",
        boxShadow: isHero ? "0 0 34px rgba(16,255,133,0.16)" : "none",
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
            filter: "grayscale(1) contrast(1.18) brightness(0.78)",
          }}
        />
      ) : (
        <Image
          src={asset.src}
          alt={signal.location}
          fill
          loading="eager"
          sizes={isHero ? "60vw" : "22vw"}
          style={{ objectFit: "cover", filter: "grayscale(1) contrast(1.18) brightness(0.64)" }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.72))",
        }}
      />
      <div style={{ position: "absolute", left: isHero ? 14 : 10, right: isHero ? 14 : 10, bottom: isHero ? 13 : 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: isHero ? 13 : 12, fontWeight: 900, textTransform: "uppercase" }}>
            {signal.location}
          </div>
          {isHero ? (
            <div style={{ color: C.green, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
              seismic video feed
            </div>
          ) : null}
        </div>
        <div style={{ marginTop: 5, color: "#d4dbe5", fontSize: isHero ? 12 : 11, lineHeight: 1.35 }}>
          {signal.text}
        </div>
      </div>
    </article>
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

  if (result.toolName === "contact_emergency_services_mock") {
    return [
      {
        type: "public_alert_draft",
        props: {
          channel: `${String(result.output.service ?? "Emergency service")} mock contact`,
          message:
            `${String(result.output.status ?? "contacted_mock")} / ${String(
              result.output.ticketId ?? "svc-mock",
            )}: ${String(
              result.output.message ??
                "Mock emergency-service contact artifact returned. No real call was made.",
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

  if (result.toolName === "contact_emergency_services_mock") {
    return [];
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
