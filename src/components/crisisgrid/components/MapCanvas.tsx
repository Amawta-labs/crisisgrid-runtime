"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/mapbox";
import { Crosshair, Layers, Map as MapIcon, Minus, Navigation, Plus, Radar } from "lucide-react";
import { circle } from "@turf/turf";
import { C } from "../tokens";

export type MapTarget = {
  center: [number, number];
  radiusMeters?: number;
  label?: string;
};

export type OperatorMapTarget = Required<MapTarget> & {
  id: string;
  source: string;
};

type MapCanvasProps = {
  mode: "standby" | "active";
  target?: MapTarget | null;
  operatorTargets?: OperatorMapTarget[];
  onOperatorTargetRequest?: (target: OperatorMapTarget) => void;
  chrome?: "full" | "minimal";
  viewportPaddingRight?: number;
  framed?: boolean;
};

const VITACURA_CENTER: [number, number] = [-70.5707, -33.3972];
const SANTIAGO_OVERVIEW: [number, number] = [-70.6506, -33.4372];

export function MapCanvas({
  mode,
  target,
  operatorTargets = [],
  onOperatorTargetRequest,
  chrome = "full",
  viewportPaddingRight = 24,
  framed = true,
}: MapCanvasProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const activeCenter = target?.center ?? VITACURA_CENTER;
  const activeRadiusKm = (target?.radiusMeters ?? (mode === "active" ? 1400 : 900)) / 1000;
  const riskZone = useMemo(
    () => circle(activeCenter, activeRadiusKm, {
      steps: 72,
      units: "kilometers",
    }),
    [activeCenter, activeRadiusKm],
  );

  useEffect(() => {
    if (!isMapReady || mode !== "active") return;

    const timer = window.setTimeout(() => {
      mapRef.current?.flyTo({
        center: activeCenter,
        zoom: target?.radiusMeters && target.radiusMeters > 2500 ? 13.8 : 15.25,
        pitch: 65,
        bearing: -28,
        padding: {
          top: 72,
          bottom: 72,
          left: 36,
          right: viewportPaddingRight,
        },
        duration: 2200,
        essential: true,
      });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [activeCenter, isMapReady, mode, target?.radiusMeters, viewportPaddingRight]);

  return (
    <section
      style={{
        position: "relative",
        flex: 1,
        height: "100%",
        minHeight: 0,
        margin: framed ? "0 10px" : 0,
        border: framed ? `1px solid ${C.border}` : "none",
        borderRadius: framed ? 9 : 0,
        overflow: "hidden",
        background: "#020806",
      }}
    >
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: mode === "active" ? SANTIAGO_OVERVIEW[0] : activeCenter[0],
          latitude: mode === "active" ? SANTIAGO_OVERVIEW[1] : activeCenter[1],
          zoom: mode === "active" ? 11.8 : 15.25,
          pitch: mode === "active" ? 42 : 65,
          bearing: mode === "active" ? -12 : -28,
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        onLoad={() => setIsMapReady(true)}
      >
        <Layer
          id="crisisgrid-3d-buildings"
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
              "#17342a",
              60,
              "#2f6654",
              160,
              "#8ff0bd",
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
        {mode === "active" && (
          <Source id="crisisgrid-risk-zone" type="geojson" data={riskZone}>
            <Layer
              id="crisisgrid-risk-zone-fill"
              type="fill"
              paint={{
                "fill-color": C.orange,
                "fill-opacity": 0.26,
              }}
            />
            <Layer
              id="crisisgrid-risk-zone-line"
              type="line"
              paint={{
                "line-color": C.orange,
                "line-width": 2,
                "line-opacity": 0.9,
              }}
            />
          </Source>
        )}
        <Marker longitude={activeCenter[0]} latitude={activeCenter[1]} anchor="center">
          <div
            style={{
              width: mode === "active" ? 42 : 14,
              height: mode === "active" ? 42 : 14,
              display: "grid",
              placeItems: "center",
              borderRadius: 999,
              border: `1px solid ${mode === "active" ? C.orange : C.blue}`,
              background: mode === "active" ? "#ff8a4ccc" : C.blue,
              color: C.text,
              boxShadow:
                mode === "active"
                  ? "0 0 42px rgba(255,138,76,0.75)"
                  : "0 0 44px rgba(30,167,255,0.75)",
            }}
          >
            {mode === "active" ? <Radar size={20} /> : null}
          </div>
        </Marker>
      </Map>

      {chrome === "full" ? (
        <>
          <div
            style={{
              position: "absolute",
              left: 18,
              top: 18,
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 42,
              border: `1px solid ${C.borderStrong}`,
              borderRadius: 8,
              background: "rgba(5,11,17,0.86)",
              color: C.text,
              padding: "0 14px",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            <MapIcon size={18} />
            Map view
          </div>

          <div
            style={{
              position: "absolute",
              right: 18,
              top: 18,
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 42,
              border: `1px solid ${C.borderStrong}`,
              borderRadius: 8,
              background: "rgba(5,11,17,0.86)",
              color: C.text,
              padding: "0 14px",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            <Layers size={18} />
            Layers
          </div>
        </>
      ) : null}

      {mode === "active" && target?.label ? (
        <div
          style={{
            position: "absolute",
            left: 18,
            bottom: 18,
            maxWidth: 340,
            border: `1px solid rgba(255,138,76,0.42)`,
            borderRadius: 8,
            background: "rgba(5,11,17,0.86)",
            color: C.text,
            padding: "12px 14px",
            boxShadow: "0 0 34px rgba(255,138,76,0.16)",
          }}
        >
          <div style={{ color: C.orange, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.9 }}>
            Map camera reassigned by agent
          </div>
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 800 }}>
            {target.label}
          </div>
          <div style={{ marginTop: 5, color: "#aeb7c3", fontSize: 11 }}>
            {activeCenter[1].toFixed(4)}, {activeCenter[0].toFixed(4)}
          </div>
        </div>
      ) : null}

      {mode === "active" && operatorTargets.length > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: target?.label ? 104 : 18,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              height: 34,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: `1px solid rgba(30,167,255,0.35)`,
              borderRadius: 7,
              background: "rgba(5,11,17,0.88)",
              color: C.blue,
              padding: "0 10px",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            <Navigation size={14} />
            Orchestrator map tool
          </div>
          {operatorTargets.map((operatorTarget) => (
            <button
              key={operatorTarget.id}
              onClick={() => onOperatorTargetRequest?.(operatorTarget)}
              style={{
                height: 34,
                border: `1px solid rgba(255,255,255,0.16)`,
                borderRadius: 7,
                background: "rgba(5,11,17,0.88)",
                color: C.text,
                padding: "0 11px",
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                boxShadow: "0 0 20px rgba(0,0,0,0.28)",
              }}
            >
              {operatorTarget.label}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "standby" ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "47%",
            transform: "translate(-50%, -50%)",
            color: C.text,
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 86,
              height: 86,
              display: "grid",
              placeItems: "center",
              margin: "0 auto 18px",
              borderRadius: 999,
              border: `1px solid ${C.blue}`,
              boxShadow: "0 0 32px rgba(30,167,255,0.38), inset 0 0 26px rgba(30,167,255,0.16)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                display: "grid",
                placeItems: "center",
                borderRadius: 999,
                border: `1px solid ${C.blue}`,
              }}
            >
              <Crosshair size={20} color={C.blue} />
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, textTransform: "uppercase" }}>
            Awaiting signals
          </div>
          <div style={{ marginTop: 12, color: "#c4cad4", lineHeight: 1.45, fontSize: 14 }}>
            The system is monitoring all channels.
            <br />
            Incoming signals will appear here.
          </div>
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          right: 18,
          bottom: 88,
          display: "grid",
          gap: 8,
        }}
      >
        <MapButton icon={<Plus size={22} />} />
        <MapButton icon={<Minus size={22} />} />
        <MapButton icon={<Crosshair size={20} />} />
      </div>
    </section>
  );
}

function MapButton({ icon }: { icon: React.ReactNode }) {
  return (
    <button
      style={{
        width: 46,
        height: 46,
        display: "grid",
        placeItems: "center",
        border: `1px solid ${C.borderStrong}`,
        borderRadius: 7,
        background: "rgba(5,11,17,0.88)",
        color: C.text,
      }}
    >
      {icon}
    </button>
  );
}
