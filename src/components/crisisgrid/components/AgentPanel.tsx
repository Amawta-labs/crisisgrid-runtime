"use client";

import { Brain, Flag, Info, Target } from "lucide-react";
import type { CrisisAgentDefinition } from "@/lib/agentic/agents";
import type { UiComponent } from "@/lib/crisis/schemas";
import { A2UIProtocolSurface } from "../protocol/A2UIProtocolSurface";
import { C } from "../tokens";

type AgentPanelProps = {
  agentReady: boolean;
  hypotheses: string[];
  objectives: string[];
  agents?: Array<CrisisAgentDefinition & { status: "active" | "standby" }>;
  summary?: string;
  components?: UiComponent[];
  eventCount?: number;
};

export function AgentPanel({
  agentReady,
  hypotheses,
  objectives,
  agents = [],
  summary,
  components = [],
  eventCount = 0,
}: AgentPanelProps) {
  const resolvedHypotheses = hypotheses.length > 0 ? hypotheses : [];
  const resolvedObjectives = objectives.length > 0 ? objectives : [];

  return (
    <aside
      style={{
        width: 310,
        borderLeft: `1px solid ${C.border}`,
        background: C.bg0,
        color: C.text,
        padding: 14,
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 14, textTransform: "uppercase" }}>
            Agent insights
          </h2>
        </div>
        <Info size={16} color={C.muted} />
      </div>

      <div
        style={{
          marginTop: 18,
          height: 214,
          display: "grid",
          placeItems: "center",
          border: `1px solid ${C.border}`,
          borderRadius: 7,
          background:
            "radial-gradient(circle at 50% 24%, rgba(30,167,255,0.22), transparent 38%), rgba(7,16,24,0.76)",
          textAlign: "center",
          padding: 24,
        }}
      >
        <Brain size={58} color={C.blue} strokeWidth={1.15} />
        <div style={{ marginTop: 14, fontSize: 16, fontWeight: 800 }}>
          {resolvedHypotheses.length > 0 ? "Agent graph is active." : "Agent is initializing."}
        </div>
        <p style={{ margin: "10px 0 0", color: "#c2c8d1", lineHeight: 1.45, fontSize: 14 }}>
          {summary ?? (agentReady ? "Waiting for incoming signals" : "Booting agent runtime")}
          <br />
          {resolvedHypotheses.length > 0 ? "runtime events are mutating the UI." : "to begin analysis."}
        </p>
      </div>

      <Section title="Current hypotheses">
        {resolvedHypotheses.length > 0 ? (
          resolvedHypotheses.map((item) => <Row key={item} icon="target" text={item} />)
        ) : (
          <EmptyBox
            icon="target"
            title="No hypotheses yet"
            detail="Hypotheses will be generated as signals arrive and are analyzed."
          />
        )}
      </Section>

      {agents.length > 0 ? (
        <Section title="Agent mesh">
          <div style={{ display: "grid", gap: 8 }}>
            {agents.map((agent) => (
              <AgentNode key={agent.id} agent={agent} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Protocol surfaces">
        <ProtocolStatus />
        <A2UIProtocolSurface components={components} eventCount={eventCount} />
      </Section>

      <Section title="Active objectives">
        {resolvedObjectives.length > 0 ? (
          resolvedObjectives.map((item) => <Row key={item} icon="flag" text={item} />)
        ) : (
          <EmptyBox
            icon="flag"
            title="No active objectives"
            detail="Objectives will be created based on detected events and risks."
          />
        )}
      </Section>
    </aside>
  );
}

function ProtocolStatus() {
  return (
    <div
      style={{
        display: "grid",
        gap: 7,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        background: "rgba(255,255,255,0.025)",
        padding: 10,
        fontSize: 11,
        color: "#b9c3ce",
      }}
    >
      <div>
        <strong style={{ color: C.blue }}>CopilotKit</strong> provider mounted at{" "}
        <code>/api/copilotkit</code>
      </div>
      <div>
        <strong style={{ color: C.green }}>AG-UI</strong> event stream exposed at{" "}
        <code>/api/runtime/ag-ui</code>
      </div>
    </div>
  );
}

function AgentNode({
  agent,
}: {
  agent: CrisisAgentDefinition & { status: "active" | "standby" };
}) {
  const active = agent.status === "active";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "8px 1fr",
        gap: 9,
        alignItems: "start",
        border: `1px solid ${active ? "rgba(16,255,133,0.28)" : C.border}`,
        borderRadius: 8,
        background: active ? "rgba(16,255,133,0.045)" : "rgba(255,255,255,0.025)",
        padding: 9,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          marginTop: 5,
          borderRadius: 99,
          background: active ? C.green : "#334352",
          boxShadow: active ? "0 0 12px rgba(16,255,133,0.72)" : "none",
        }}
      />
      <div>
        <div style={{ color: C.text, fontSize: 12, fontWeight: 800 }}>
          {agent.label}
        </div>
        <div style={{ marginTop: 3, color: "#aeb7c3", fontSize: 11, lineHeight: 1.35 }}>
          {agent.output}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 18 }}>
      <h3 style={{ margin: "0 0 10px", color: C.muted, fontSize: 12, textTransform: "uppercase" }}>
        {title}
      </h3>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </section>
  );
}

function EmptyBox({
  icon,
  title,
  detail,
}: {
  icon: "target" | "flag";
  title: string;
  detail: string;
}) {
  const Icon = icon === "target" ? Target : Flag;
  return (
    <div
      style={{
        minHeight: 132,
        display: "grid",
        placeItems: "center",
        border: `1px dashed ${C.borderStrong}`,
        borderRadius: 8,
        color: C.text,
        padding: 14,
        textAlign: "center",
      }}
    >
      <div>
        <Icon size={32} color={C.muted} strokeWidth={1.4} />
        <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>{title}</div>
        <p style={{ margin: "10px 0 0", color: "#aeb6c3", fontSize: 13, lineHeight: 1.45 }}>
          {detail}
        </p>
      </div>
    </div>
  );
}

function Row({ icon, text }: { icon: "target" | "flag"; text: string }) {
  const Icon = icon === "target" ? Target : Flag;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "18px 1fr",
        gap: 10,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        background: "rgba(255,255,255,0.035)",
        padding: 11,
      }}
    >
      <Icon size={16} color={icon === "target" ? C.blue : C.green} />
      <span style={{ color: C.text, fontSize: 13, lineHeight: 1.45 }}>{text}</span>
    </div>
  );
}
