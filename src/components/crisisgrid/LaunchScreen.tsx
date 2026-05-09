"use client";

import { useEffect, useState } from "react";
import { Camera, ChevronRight, MapPin, MessageSquare } from "lucide-react";
import Image from "next/image";

const cameraFeeds = [
  {
    id: "CAM-017",
    label: "Costanera Norte",
    image: "/camera-feeds/costanera-norte.jpg",
  },
  {
    id: "CAM-042",
    label: "Autopista Central",
    image: "/camera-feeds/autopista-central.jpg",
  },
  {
    id: "CAM-088",
    label: "Concepcion",
    image: "/camera-feeds/concepcion.jpg",
  },
  {
    id: "CAM-104",
    label: "Valparaiso",
    image: "/camera-feeds/valparaiso.jpg",
  },
  {
    id: "CAM-119",
    label: "Vina del Mar",
    image: "/camera-feeds/vina-del-mar.jpg",
  },
];

const socialSources = [
  { label: "X", color: "#e8eef7" },
  { label: "f", color: "#1d8cff" },
  { label: "◎", color: "#ff5f9d" },
  { label: "♪", color: "#f5f8ff" },
  { label: "▶", color: "#ffffff" },
];

export function LaunchScreen({
  onActivate,
  passive = false,
}: {
  onActivate?: () => void;
  passive?: boolean;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 760);
    return () => window.clearInterval(id);
  }, []);

  const activeCameras = Math.min(cameraFeeds.length, Math.max(1, tick));
  const socialActive = tick >= 5;
  const connectedSources = Math.min(socialSources.length, Math.max(0, tick - 5));

  return (
    <main
      onClick={passive ? undefined : onActivate}
      onDoubleClick={onActivate}
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100vw",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 50%, rgba(42,255,222,0.09), transparent 23%), radial-gradient(circle at 50% 50%, rgba(125,66,255,0.08), transparent 36%), #000",
        color: "#f7fbff",
        cursor: passive ? "default" : "pointer",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.7), transparent 36%, rgba(0,0,0,0.74)), repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 5px)",
          opacity: 0.82,
        }}
      />

      <Corner left="1.5%" top="10%" />
      <Corner right="1.5%" top="10%" flipX />
      <Corner left="1.5%" bottom="8%" flipY />
      <Corner right="1.5%" bottom="8%" flipX flipY />
      <DotField left="7%" top="12%" />
      <DotField right="7%" top="12%" />

      <section
        style={{
          position: "relative",
          zIndex: 2,
          width: "min(1180px, 78vw)",
          minWidth: 860,
          margin: "0 auto",
          paddingTop: 132,
        }}
      >
        <Brand />

        <ActivityBlock
          accent="#00e99a"
          icon={<Camera size={23} />}
          label="Agente"
          title="Revisando cámaras en vivo"
          status="En tiempo real"
          rightLabel={`${activeCameras}/24 camaras activas`}
          dotsColor="#00e99a"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 18,
            }}
          >
            {cameraFeeds.map((feed, index) => (
              <CameraCard
                key={feed.id}
                feed={feed}
                visible={index < activeCameras}
              />
            ))}
          </div>
        </ActivityBlock>

        <div
          style={{
            width: 54,
            height: 54,
            display: "grid",
            placeItems: "center",
            margin: "12px auto",
            border: "1px solid rgba(30,167,255,0.38)",
            borderRadius: 999,
            color: "#1ea7ff",
            boxShadow: "0 0 26px rgba(30,167,255,0.28), inset 0 0 18px rgba(30,167,255,0.14)",
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 99,
              background: "#1ea7ff",
              boxShadow: "0 0 16px rgba(30,167,255,0.9)",
            }}
          />
        </div>

        <ActivityBlock
          accent="#a14cff"
          icon={<MessageSquare size={23} />}
          label="Agente"
          title="Analizando redes sociales"
          status="En tiempo real"
          dotsColor="#a14cff"
        >
          <div
            style={{
              position: "relative",
              height: 132,
              border: "1px solid rgba(161,76,255,0.16)",
              borderRadius: 8,
              background:
                "linear-gradient(90deg, rgba(161,76,255,0.08), rgba(0,0,0,0.18), rgba(161,76,255,0.08))",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 20,
                top: 20,
                color: "#b37aff",
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {socialActive ? "Conectando fuentes..." : "Esperando senales sociales"}
            </div>

            <div
              style={{
                position: "absolute",
                inset: "38px 86px 22px",
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                alignItems: "center",
              }}
            >
              {socialSources.map((source, index) => (
                <SocialNode
                  key={source.label}
                  label={source.label}
                  color={source.color}
                  active={index < connectedSources}
                />
              ))}
            </div>

            <div
              style={{
                position: "absolute",
                right: 110,
                top: 61,
                color: "#a986ff",
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Conectando...
            </div>
            <span style={{ position: "absolute", right: 62, top: 68, display: "flex", gap: 8 }}>
              {Array.from({ length: 4 }).map((_, index) => (
                <span
                  key={index}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 99,
                    background: index < connectedSources ? "#a14cff" : "rgba(161,76,255,0.22)",
                    boxShadow: index < connectedSources ? "0 0 12px rgba(161,76,255,0.7)" : "none",
                  }}
                />
              ))}
            </span>
          </div>
        </ActivityBlock>

        <footer
          style={{
            marginTop: 28,
            textAlign: "center",
            color: "rgba(220,235,244,0.42)",
            fontSize: 12,
            letterSpacing: "0.55em",
            textTransform: "uppercase",
          }}
        >
          Sistema operativo de crisis inteligente
          <div
            style={{
              width: 460,
              height: 1,
              margin: "24px auto 0",
              background:
                "linear-gradient(90deg, transparent, rgba(38,255,214,0.65), transparent)",
              boxShadow: "0 0 18px rgba(38,255,214,0.4)",
            }}
          />
        </footer>
      </section>
    </main>
  );
}

function Brand() {
  return (
    <div style={{ textAlign: "center", marginBottom: 42 }}>
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: "0.52em",
          textIndent: "0.52em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        CRISIS<span style={{ color: "#ff263b", textShadow: "0 0 18px rgba(255,38,59,0.45)" }}>GRID</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          marginTop: 30,
          color: "#12e198",
          fontSize: 16,
          letterSpacing: "0.34em",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 99,
            background: "#12e198",
            boxShadow: "0 0 18px rgba(18,225,152,0.75)",
          }}
        />
        En linea
      </div>
    </div>
  );
}

function ActivityBlock({
  accent,
  icon,
  label,
  title,
  status,
  rightLabel,
  dotsColor,
  children,
}: {
  accent: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  status: string;
  rightLabel?: string;
  dotsColor: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        position: "relative",
        borderLeft: `2px solid ${accent}`,
        borderRight: `2px solid ${accent}`,
        padding: "0 34px 28px",
        filter: `drop-shadow(0 0 20px ${accent}22)`,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginLeft: 70 }}>
          <div
            style={{
              width: 52,
              height: 52,
              display: "grid",
              placeItems: "center",
              borderRadius: 12,
              color: accent,
              background: `${accent}12`,
              boxShadow: `0 0 28px ${accent}22`,
            }}
          >
            {icon}
          </div>
          <div>
            <div style={{ color: "#808a98", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {label}
            </div>
            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 500 }}>{title}</div>
          </div>
          <div
            style={{
              height: 30,
              display: "flex",
              alignItems: "center",
              border: `1px solid ${accent}35`,
              borderRadius: 7,
              color: accent,
              padding: "0 12px",
              fontSize: 12,
              textTransform: "uppercase",
            }}
          >
            {status}
          </div>
        </div>

        {rightLabel ? (
          <div style={{ color: "#bcc4d0", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", paddingRight: 32 }}>
            {rightLabel}
            <span style={{ display: "inline-flex", gap: 7, marginLeft: 14 }}>
              {Array.from({ length: 4 }).map((_, index) => (
                <span
                  key={index}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 99,
                    background: index < 4 ? dotsColor : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </span>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 34 }}>{children}</div>

      <ChevronRight
        size={27}
        style={{
          position: "absolute",
          right: -44,
          top: "50%",
          color: accent,
          transform: "translateY(-50%)",
        }}
      />
    </section>
  );
}

function CameraCard({
  feed,
  visible,
}: {
  feed: (typeof cameraFeeds)[number];
  visible: boolean;
}) {
  return (
    <div
      style={{
        height: 158,
        border: "1px solid rgba(170,195,220,0.28)",
        borderRadius: 7,
        overflow: "hidden",
        background: "rgba(2,8,14,0.9)",
        opacity: visible ? 1 : 0.12,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "all 260ms ease",
      }}
    >
      <div style={{ position: "relative", height: 112, overflow: "hidden" }}>
        <Image
          src={feed.image}
          alt={feed.label}
          width={640}
          height={360}
          priority={feed.id === "CAM-017"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "grayscale(1) contrast(1.25) brightness(0.58)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.62)), repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#f8fbff",
            fontSize: 11,
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 99,
              background: "#0ff48e",
              boxShadow: "0 0 12px rgba(15,244,142,0.75)",
            }}
          />
          En vivo
        </div>
      </div>
      <div
        style={{
          height: 46,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
          color: "#f6f9ff",
          fontSize: 12,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <MapPin size={15} />
        {feed.label}
      </div>
    </div>
  );
}

function SocialNode({
  label,
  color,
  active,
}: {
  label: string;
  color: string;
  active: boolean;
}) {
  return (
    <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          right: "-50%",
          height: 1,
          background: "linear-gradient(90deg, rgba(160,125,255,0.38), transparent)",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 50,
          height: 50,
          display: "grid",
          placeItems: "center",
          border: `1px solid ${active ? color : "rgba(170,180,200,0.25)"}`,
          borderRadius: 999,
          background: "rgba(0,0,0,0.76)",
          color: active ? color : "rgba(200,210,225,0.42)",
          fontSize: 24,
          fontWeight: 700,
          boxShadow: active ? `0 0 24px ${color}33` : "none",
          transition: "all 260ms ease",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Corner({
  left,
  right,
  top,
  bottom,
  flipX,
  flipY,
}: {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  flipX?: boolean;
  flipY?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        right,
        top,
        bottom,
        width: 16,
        height: 16,
        borderLeft: "1px solid rgba(210,230,238,0.62)",
        borderTop: "1px solid rgba(210,230,238,0.62)",
        transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
      }}
    />
  );
}

function DotField({
  left,
  right,
  top,
}: {
  left?: string;
  right?: string;
  top: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        right,
        top,
        display: "grid",
        gridTemplateColumns: "repeat(6, 4px)",
        gap: "22px 20px",
        opacity: 0.42,
      }}
    >
      {Array.from({ length: 18 }).map((_, index) => (
        <span
          key={index}
          style={{
            width: 3,
            height: 3,
            borderRadius: 99,
            background: index % 5 === 0 ? "#d8eaff" : "#718291",
          }}
        />
      ))}
    </div>
  );
}
