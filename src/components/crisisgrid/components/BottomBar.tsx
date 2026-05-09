"use client";

import { AlertTriangle, FileText, MessageSquare, Settings, Truck, Zap } from "lucide-react";
import { C } from "../tokens";

type BottomBarProps = {
  systemReady: boolean;
  systemMessage: string;
  agentsActive: number;
  agentsTotal: number;
  defaultTab: string;
  onTabChange?: (tab: string) => void;
};

const tabs = [
  { id: "situation", label: "Situation", icon: Zap },
  { id: "incidents", label: "Incidents", icon: AlertTriangle },
  { id: "resources", label: "Resources", icon: Truck },
  { id: "communications", label: "Communications", icon: MessageSquare },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "config", label: "Config", icon: Settings },
];

export function BottomBar({
  systemReady,
  systemMessage,
  agentsActive,
  agentsTotal,
  defaultTab,
  onTabChange,
}: BottomBarProps) {
  return (
    <footer
      style={{
        height: 66,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: `1px solid ${C.border}`,
        background: C.bg0,
        color: C.text,
        padding: "0 12px",
      }}
    >
      <nav
        style={{
          flex: 1,
          height: 52,
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(120px, 1fr))",
          border: `1px solid ${C.border}`,
          borderRadius: 9,
          overflow: "hidden",
          background: C.panel,
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === defaultTab;
          return (
          <button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              border: 0,
              borderRight: `1px solid ${C.border}`,
              background: active ? "rgba(30,167,255,0.08)" : "transparent",
              color: active ? C.blue : "#c3c9d2",
              cursor: "pointer",
              textTransform: "uppercase",
              fontSize: 13,
            }}
          >
            <Icon size={22} strokeWidth={1.6} />
            {tab.label}
            {active ? (
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 22,
                  right: 22,
                  height: 2,
                  background: C.blue,
                  boxShadow: "0 0 12px rgba(30,167,255,0.7)",
                }}
              />
            ) : null}
          </button>
          );
        })}
      </nav>

      <div
        title={systemMessage}
        style={{
          width: 374,
          height: 52,
          marginLeft: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          border: `1px solid ${C.border}`,
          borderRadius: 9,
          background: C.panel,
          color: C.muted,
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        <span>Agents active</span>
        <strong style={{ color: C.text, fontSize: 18 }}>{agentsActive} / {agentsTotal}</strong>
        <span style={{ display: "flex", gap: 8 }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <span
              key={index}
              style={{
                width: 10,
                height: 10,
                borderRadius: 99,
                background:
                  index < agentsActive ? C.green : systemReady ? "rgba(85,103,125,0.5)" : C.amber,
              }}
            />
          ))}
        </span>
      </div>
    </footer>
  );
}
