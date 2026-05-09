"use client";

import { Camera, Car, MessageSquare, Radio, Smartphone, TowerControl, Zap } from "lucide-react";
import { C } from "../tokens";

export type SignalChannel = {
  id: string;
  label: string;
  count: number;
  status: "quiet" | "watch" | "active";
};

export const DEFAULT_CHANNELS: SignalChannel[] = [
  { id: "camera", label: "CCTV Cameras", count: 0, status: "quiet" },
  { id: "citizen", label: "Citizen Videos", count: 0, status: "quiet" },
  { id: "radio", label: "911 Audio", count: 0, status: "quiet" },
  { id: "social", label: "Social Media", count: 0, status: "quiet" },
  { id: "traffic", label: "Traffic Data", count: 0, status: "quiet" },
  { id: "sensor", label: "Sensor Network", count: 0, status: "quiet" },
  { id: "field", label: "Field Reports", count: 0, status: "quiet" },
];

const icons = {
  camera: Camera,
  radio: Radio,
  citizen: Smartphone,
  sensor: Zap,
  traffic: Car,
  social: MessageSquare,
  field: MessageSquare,
};

type SignalPanelProps = {
  channels: SignalChannel[];
  newCount?: number;
  onChannelClick?: (id: string) => void;
};

export function SignalPanel({ channels, newCount = 0, onChannelClick }: SignalPanelProps) {
  return (
    <aside
      style={{
        width: 268,
        borderRight: `1px solid ${C.border}`,
        background: C.bg0,
        color: C.text,
        padding: 12,
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: "8px 0 4px", fontSize: 14, textTransform: "uppercase" }}>
          Incoming signals
        </h2>
        <span
          style={{
            border: `1px solid ${C.borderStrong}`,
            borderRadius: 7,
            color: C.blue,
            fontSize: 11,
            padding: "2px 7px",
            textTransform: "uppercase",
          }}
        >
          {newCount} new
        </span>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        {channels.map((channel) => {
          const Icon = icons[channel.id as keyof typeof icons] ?? TowerControl;
          return (
            <button
              key={channel.id}
              onClick={() => onChannelClick?.(channel.id)}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                background:
                  "linear-gradient(135deg, rgba(11,23,35,0.92), rgba(3,9,14,0.92))",
                color: C.text,
                padding: 10,
                textAlign: "left",
                cursor: "pointer",
                minHeight: 78,
                borderLeft: `2px solid ${statusColor(channel.id)}`,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "46px 1fr", gap: 10 }}>
                <div style={{ display: "grid", placeItems: "center", color: "#9fb2c7" }}>
                  <Icon size={26} strokeWidth={1.6} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>
                    {channel.label}
                  </div>
                  <div style={{ marginTop: 5, color: C.muted, fontSize: 12 }}>
                    {channelText(channel)}
                  </div>
                  <div style={{ marginTop: 5, color: channel.count > 0 ? C.green : C.blue, fontSize: 12 }}>
                    {channel.count > 0 ? `${channel.count} runtime events` : "No data yet"}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function statusColor(id: string) {
  if (id === "citizen" || id === "field") return C.violet;
  if (id === "radio") return "#4468ff";
  if (id === "social") return "#21b7ff";
  if (id === "traffic") return C.orange;
  if (id === "sensor") return C.green;
  return "#d7e6ff";
}

function channelText(channel: SignalChannel) {
  const count = channel.count;
  if (channel.id === "camera") return `${count} active feeds`;
  if (channel.id === "citizen") return `${count} citizen inputs`;
  if (channel.id === "radio") return count > 0 ? `${count} active calls` : "No active calls";
  if (channel.id === "social") return count > 0 ? `${count} social signals` : "Monitoring keywords";
  if (channel.id === "traffic") return count > 0 ? `${count} disruptions` : "No incidents";
  if (channel.id === "sensor") return count > 0 ? `${count} sensor events` : "All sensors normal";
  return "No new reports";
}
