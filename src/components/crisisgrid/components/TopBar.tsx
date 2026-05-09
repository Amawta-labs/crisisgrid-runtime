"use client";

import { Brain, Info, List } from "lucide-react";
import { C } from "../tokens";

type TopBarProps = {
  agentMode: "ACTIVE" | "IDLE" | "PAUSED";
  systemStatus: string;
  onReasoningClick?: () => void;
};

export function TopBar({
  agentMode,
  systemStatus,
  onReasoningClick,
}: TopBarProps) {
  return (
    <header
      style={{
        height: 86,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        borderBottom: `1px solid ${C.border}`,
        background: "#02070bcc",
        color: C.text,
        gap: 18,
      }}
    >
      <div style={{ width: 264, paddingLeft: 14 }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4, lineHeight: 1 }}>
          CRISIS<span style={{ color: C.red }}>GRID</span>
        </div>
        <div style={{ marginTop: 8, color: C.muted, fontSize: 17, letterSpacing: 8 }}>
          RUNTIME
        </div>
      </div>

      <div
        style={{
          flex: 1,
          height: 74,
          display: "grid",
          gridTemplateColumns: "200px 160px 1fr",
          alignItems: "center",
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          background: "linear-gradient(90deg, rgba(7,16,24,0.94), rgba(2,7,11,0.82))",
          boxShadow: "inset 0 0 30px rgba(30,167,255,0.04)",
        }}
      >
        <TopMetric label="Agent mode" value={agentMode} valueColor={C.green} dots />
        <TopMetric label="System status" value={systemStatus} valueColor={C.blue} />
        <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 24 }}>
          <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Time</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>14:27:03</span>
            <span style={{ color: C.muted, fontSize: 12 }}>UTC -3</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 8 }}>
        <button
          onClick={onReasoningClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 42,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            background: C.bg2,
            color: C.text,
            padding: "0 16px",
            cursor: "pointer",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          <Brain size={16} />
          Agent reasoning
          <Info size={14} color={C.blue} />
        </button>
        <div style={{ width: 1, height: 40, background: C.border }} />
        <div style={{ color: C.muted }}>
          <List size={31} />
        </div>
      </div>
    </header>
  );
}

function TopMetric({
  label,
  value,
  valueColor,
  dots,
}: {
  label: string;
  value: string;
  valueColor: string;
  dots?: boolean;
}) {
  return (
    <div
      style={{
        height: "100%",
        borderLeft: `1px solid ${C.border}`,
        padding: "14px 22px",
      }}
    >
      <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <span style={{ color: valueColor, fontSize: 16, fontWeight: 800 }}>{value}</span>
        {dots ? (
          <span style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <span
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: index < 4 ? C.green : "rgba(16,255,133,0.25)",
                }}
              />
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}
