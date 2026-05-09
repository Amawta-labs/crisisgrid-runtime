"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useMemo, useState } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl/mapbox";
import {
  AlertTriangle,
  Bot,
  Check,
  Clock3,
  Layers3,
  MapPin,
  Radio,
  Route,
  Satellite,
  Send,
  ShieldCheck,
  Siren,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { circle } from "@turf/turf";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { scenarios } from "@/lib/crisis/scenarios";
import { compileCrisisUiPlan } from "@/lib/crisis/runtime";
import type { Scenario, Signal, UiComponent, UiPlan } from "@/lib/crisis/schemas";

type RunState = "idle" | "ingesting" | "compiling" | "ready" | "approved";

const sourceIcon: Record<Signal["source"], React.ElementType> = {
  camera: Satellite,
  radio: Radio,
  citizen: Bot,
  traffic: Route,
  sensor: Zap,
  social: Send,
};

const VITACURA_CENTER: [number, number] = [-70.5707, -33.3972];

export function CrisisRuntime() {
  const [scenarioId, setScenarioId] = useState(scenarios[1].id);
  const [runState, setRunState] = useState<RunState>("idle");
  const [visibleSignals, setVisibleSignals] = useState(0);
  const [approved, setApproved] = useState(false);

  const scenario = useMemo(
    () => scenarios.find((item) => item.id === scenarioId) ?? scenarios[0],
    [scenarioId],
  );
  const plan = useMemo(() => compileCrisisUiPlan(scenario), [scenario]);

  function changeScenario(nextScenarioId: string) {
    setScenarioId(nextScenarioId);
    setRunState("idle");
    setVisibleSignals(0);
    setApproved(false);
  }

  function runCompile() {
    setRunState("ingesting");
    setVisibleSignals(0);
    setApproved(false);

    scenario.signals.forEach((_, index) => {
      window.setTimeout(() => {
        setVisibleSignals(index + 1);
      }, 280 + index * 360);
    });

    window.setTimeout(() => setRunState("compiling"), 1650);
    window.setTimeout(() => setRunState("ready"), 2550);
  }

  function approveAction() {
    setApproved(true);
    setRunState("approved");
  }

  const renderedComponents =
    runState === "idle" || runState === "ingesting"
      ? plan.components.filter((component) => component.type === "signal_inbox")
      : runState === "compiling"
        ? plan.components.slice(0, 3)
        : plan.components;

  return (
    <main className="min-h-screen bg-[#08100d] text-slate-100">
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-white/10 bg-[#0b1511]/95 px-4 py-3 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-emerald-200/80">
                <Sparkles className="size-4" />
                Generative operational UI runtime
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-white md:text-3xl">
                CrisisGrid Runtime
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={scenarioId} onValueChange={changeScenario}>
                <TabsList className="h-auto flex-wrap bg-white/8 p-1 text-slate-200">
                  {scenarios.map((item) => (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      className="data-[state=active]:bg-emerald-400 data-[state=active]:text-emerald-950"
                    >
                      {item.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Button
                onClick={runCompile}
                className="bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
              >
                <Siren className="size-4" />
                Compile UI
              </Button>
            </div>
          </div>
        </header>

        <section className="grid flex-1 grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)_360px]">
          <aside className="border-b border-white/10 bg-[#0d1713] lg:border-b-0 lg:border-r">
            <SignalInbox
              scenario={scenario}
              visibleSignals={visibleSignals}
              runState={runState}
            />
          </aside>

          <section className="relative min-h-[560px] overflow-hidden bg-[#07110e]">
            <RuntimeStatus runState={runState} />
            <GeneratedSurface
              plan={plan}
              components={renderedComponents}
              scenario={scenario}
              approved={approved}
              onApprove={approveAction}
            />
          </section>

          <aside className="border-t border-white/10 bg-[#0d1713] lg:border-l lg:border-t-0">
            <AgentTrace plan={plan} runState={runState} approved={approved} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function RuntimeStatus({ runState }: { runState: RunState }) {
  const progress = {
    idle: 0,
    ingesting: 34,
    compiling: 68,
    ready: 92,
    approved: 100,
  }[runState];

  return (
    <div className="absolute left-4 right-4 top-4 z-20 rounded-md border border-white/10 bg-[#0c1713]/90 p-3 shadow-2xl backdrop-blur md:left-6 md:right-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-emerald-400/15 text-emerald-300">
            <Layers3 className="size-4" />
          </span>
          <div>
            <div className="text-sm font-medium text-white">
              {runState === "idle"
                ? "Waiting for signal burst"
                : runState === "ingesting"
                  ? "Ingesting ambiguous signals"
                  : runState === "compiling"
                    ? "Compiling operational surface"
                    : runState === "ready"
                      ? "Human gate required"
                      : "Tool action executed"}
            </div>
            <div className="text-xs text-slate-400">
              {"state -> generated UI -> action -> new state -> new UI"}
            </div>
          </div>
        </div>
        <Badge className="bg-white/10 text-slate-100">
          {runState.toUpperCase()}
        </Badge>
      </div>
      <Progress value={progress} className="mt-3 h-1.5 bg-white/10" />
    </div>
  );
}

function SignalInbox({
  scenario,
  visibleSignals,
  runState,
}: {
  scenario: Scenario;
  visibleSignals: number;
  runState: RunState;
}) {
  const shownSignals =
    runState === "idle" ? scenario.signals.slice(0, 2) : scenario.signals.slice(0, visibleSignals);

  return (
    <div className="flex h-full flex-col p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Incoming signals</h2>
          <p className="text-sm text-slate-400">Chaotic inputs before the UI exists.</p>
        </div>
        <Badge className="bg-amber-300 text-amber-950">
          {runState === "idle" ? "seed" : "live"}
        </Badge>
      </div>

      <ScrollArea className="mt-5 h-[calc(100vh-180px)] min-h-[360px]">
        <div className="space-y-3 pr-3">
          {shownSignals.map((signal, index) => {
            const Icon = sourceIcon[signal.source];
            return (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-md border border-white/10 bg-white/[0.045] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs uppercase text-emerald-200/80">
                    <Icon className="size-4" />
                    {signal.source}
                  </div>
                  <span className="text-xs text-slate-500">{signal.receivedAt}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-100">{signal.text}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>{signal.location}</span>
                  <span>{Math.round(signal.confidence * 100)}% confidence</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function GeneratedSurface({
  plan,
  components,
  scenario,
  approved,
  onApprove,
}: {
  plan: UiPlan;
  components: UiComponent[];
  scenario: Scenario;
  approved: boolean;
  onApprove: () => void;
}) {
  return (
    <div className="h-full px-4 pb-6 pt-28 md:px-6">
      <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="min-h-[460px] overflow-hidden rounded-md border border-white/10 bg-black/30">
          <CrisisMap plan={plan} scenario={scenario} />
        </div>
        <div className="space-y-4">
          {components
            .filter((component) => component.type !== "signal_inbox" && component.type !== "generated_map_surface")
            .map((component) => (
              <motion.div
                key={component.type}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-md border border-white/10 bg-[#101c17]/92 p-4 shadow-xl"
              >
                <ComponentRenderer
                  component={component}
                  approved={approved}
                  onApprove={onApprove}
                />
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
}

function CrisisMap({ plan, scenario }: { plan: UiPlan; scenario: Scenario }) {
  const mapComponent = plan.components.find(
    (component) => component.type === "generated_map_surface",
  );

  const mapProps =
    mapComponent?.type === "generated_map_surface"
      ? mapComponent.props
      : {
          center: scenario.center,
          radiusMeters: 1000,
          severity: plan.severity,
          label: scenario.name,
        };
  const center = VITACURA_CENTER;
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const riskZone = useMemo(
    () =>
      circle(center, mapProps.radiusMeters / 1000, {
        steps: 72,
        units: "kilometers",
      }),
    [center, mapProps.radiusMeters],
  );

  return (
    <div className="relative h-full min-h-[460px]">
      <Map
        mapboxAccessToken={token}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom: 15.2,
          pitch: 64,
          bearing: -28,
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <Layer
          id="3d-buildings"
          source="composite"
          source-layer="building"
          filter={["==", "extrude", "true"]}
          type="fill-extrusion"
          minzoom={14}
          paint={{
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["get", "height"],
              0,
              "#1f3b32",
              60,
              "#3f6f5d",
              160,
              "#a6f3c3",
            ],
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              0,
              15.05,
              ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              0,
              15.05,
              ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.72,
          }}
        />
        <Source id="risk-zone" type="geojson" data={riskZone}>
          <Layer
            id="risk-zone-fill"
            type="fill"
            paint={{
              "fill-color": plan.severity === "critical" ? "#f97316" : "#facc15",
              "fill-opacity": 0.24,
            }}
          />
          <Layer
            id="risk-zone-line"
            type="line"
            paint={{
              "line-color": plan.severity === "critical" ? "#fb923c" : "#fde047",
              "line-width": 2,
              "line-opacity": 0.9,
            }}
          />
        </Source>
        <Marker longitude={center[0]} latitude={center[1]} anchor="center">
          <div className="flex size-10 items-center justify-center rounded-full border border-orange-200 bg-orange-500/85 text-white shadow-[0_0_40px_rgba(249,115,22,0.75)]">
            <AlertTriangle className="size-5" />
          </div>
        </Marker>
      </Map>

      <div className="absolute bottom-4 left-4 right-4 rounded-md border border-white/10 bg-[#07110e]/90 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <MapPin className="size-4 text-orange-300" />
              Vitacura 3D operational surface
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Generated risk layer over Vitacura: {mapProps.radiusMeters.toLocaleString()}m operational radius
            </div>
          </div>
          <Badge className="bg-orange-300 text-orange-950">{plan.severity}</Badge>
        </div>
      </div>
    </div>
  );
}

function ComponentRenderer({
  component,
  approved,
  onApprove,
}: {
  component: UiComponent;
  approved: boolean;
  onApprove: () => void;
}) {
  switch (component.type) {
    case "incident_card":
      return (
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">{component.props.title}</h3>
            <Badge className={severityClass(component.props.severity)}>
              {component.props.severity}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{component.props.summary}</p>
          <div className="mt-3 text-xs text-slate-500">
            Consolidated confidence: {Math.round(component.props.confidence * 100)}%
          </div>
        </div>
      );
    case "contradiction_panel":
      return (
        <div>
          <PanelTitle icon={AlertTriangle} title="Contradictions detected" />
          <div className="mt-3 space-y-2">
            {component.props.contradictions.map((item) => (
              <div key={item} className="rounded-md bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                {item}
              </div>
            ))}
          </div>
        </div>
      );
    case "action_plan_board":
      return (
        <div>
          <PanelTitle icon={ShieldCheck} title="Action board" />
          <div className="mt-3 space-y-2">
            {component.props.actions.map((action) => (
              <div
                key={action.id}
                className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium text-white">{action.title}</div>
                  <div className="text-xs text-slate-500">{action.owner}</div>
                </div>
                <Badge className={actionStatusClass(action.status)}>{action.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      );
    case "public_alert_draft":
      return (
        <div>
          <PanelTitle icon={Send} title="Generated public advisory" />
          <div className="mt-3 rounded-md bg-slate-950/60 p-3 text-sm leading-6 text-slate-200">
            {component.props.message}
          </div>
          <div className="mt-2 text-xs text-slate-500">Channel: {component.props.channel}</div>
        </div>
      );
    case "civic_gate":
      return (
        <div>
          <PanelTitle icon={Siren} title={component.props.title} />
          <p className="mt-2 text-sm leading-6 text-slate-300">{component.props.risk}</p>
          <Button
            onClick={onApprove}
            disabled={approved}
            className={cn(
              "mt-4 w-full",
              approved
                ? "bg-emerald-500 text-emerald-950"
                : "bg-orange-400 text-orange-950 hover:bg-orange-300",
            )}
          >
            {approved ? <Check className="size-4" /> : <ShieldCheck className="size-4" />}
            {approved ? "Advisory approved and published" : component.props.approvalLabel}
          </Button>
        </div>
      );
    default:
      return null;
  }
}

function AgentTrace({
  plan,
  runState,
  approved,
}: {
  plan: UiPlan;
  runState: RunState;
  approved: boolean;
}) {
  const timeline = plan.components.find(
    (component) => component.type === "agent_trace_timeline",
  );
  const events =
    timeline?.type === "agent_trace_timeline" ? timeline.props.events : [];

  return (
    <div className="flex h-full flex-col p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Agent loop</h2>
          <p className="text-sm text-slate-400">Readable state for the next render.</p>
        </div>
        <Bot className="size-5 text-emerald-300" />
      </div>

      <div className="mt-5 space-y-4">
        {events.map((event, index) => (
          <div key={event.label} className="grid grid-cols-[28px_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-400 text-xs font-semibold text-emerald-950">
                {index + 1}
              </span>
              {index < events.length - 1 ? <span className="h-10 w-px bg-white/10" /> : null}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{event.label}</div>
              <p className="mt-1 text-sm leading-6 text-slate-400">{event.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-5 bg-white/10" />

      <div className="space-y-2">
        {plan.toolActions.map((tool) => {
          const status =
            approved && tool.id === "publish-alert"
              ? "done"
              : runState === "approved" && tool.id === "stage-resources"
                ? "done"
                : tool.status;
          return (
            <div
              key={tool.id}
              className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2"
            >
              <div className="flex items-center gap-2 text-sm text-slate-200">
                {status === "done" ? (
                  <Check className="size-4 text-emerald-300" />
                ) : status === "running" ? (
                  <Clock3 className="size-4 text-sky-300" />
                ) : (
                  <ShieldCheck className="size-4 text-slate-500" />
                )}
                {tool.label}
              </div>
              <Badge className={actionStatusClass(status)}>{status}</Badge>
            </div>
          );
        })}
      </div>

      <div className="mt-auto rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm leading-6 text-emerald-100">
        The rendered surface is part of the next agent observation: gates,
        tool status and map state feed the next UI plan.
      </div>
    </div>
  );
}

function PanelTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-white">
      <Icon className="size-4 text-emerald-300" />
      {title}
    </div>
  );
}

function severityClass(severity: string) {
  return cn(
    severity === "critical" && "bg-orange-300 text-orange-950",
    severity === "high" && "bg-amber-300 text-amber-950",
    severity === "medium" && "bg-sky-300 text-sky-950",
    severity === "low" && "bg-emerald-300 text-emerald-950",
  );
}

function actionStatusClass(status: string) {
  return cn(
    status === "queued" && "bg-slate-500/30 text-slate-200",
    status === "pending" && "bg-slate-500/30 text-slate-200",
    status === "running" && "bg-sky-300 text-sky-950",
    status === "needs_approval" && "bg-orange-300 text-orange-950",
    status === "done" && "bg-emerald-300 text-emerald-950",
  );
}
