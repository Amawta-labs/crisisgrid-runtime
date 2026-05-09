"use client";

import { MessageProcessor, type SurfaceModel } from "@a2ui/web_core/v0_9";
import {
  A2uiSurface,
  MarkdownContext,
  basicCatalog,
  type ReactComponentImplementation,
} from "@a2ui/react/v0_9";
import { renderMarkdown } from "@a2ui/markdown-it";
import { injectStyles, removeStyles } from "@a2ui/react/styles";
import { useEffect, useState } from "react";

import { toA2UIMessages } from "@/lib/protocol/a2ui-adapter";
import type { UiComponent } from "@/lib/crisis/schemas";
import { C } from "../tokens";

type A2UIProtocolSurfaceProps = {
  components: UiComponent[];
  eventCount: number;
};

export function A2UIProtocolSurface({
  components,
  eventCount,
}: A2UIProtocolSurfaceProps) {
  const [surfaces, setSurfaces] = useState<
    Array<SurfaceModel<ReactComponentImplementation>>
  >([]);

  useEffect(() => {
    injectStyles();

    return () => removeStyles();
  }, []);

  useEffect(() => {
    const processor = new MessageProcessor([basicCatalog]);
    const sync = () => setSurfaces(Array.from(processor.model.surfacesMap.values()));
    const createdSub = processor.onSurfaceCreated(sync);
    const deletedSub = processor.onSurfaceDeleted(sync);

    processor.processMessages(toA2UIMessages(components, eventCount));
    sync();

    return () => {
      createdSub.unsubscribe();
      deletedSub.unsubscribe();
    };
  }, [components, eventCount]);

  return (
    <div
      style={{
        border: "1px solid rgba(16,255,133,0.22)",
        borderRadius: 8,
        background: "rgba(16,255,133,0.035)",
        padding: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          color: C.green,
          fontSize: 11,
          fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        <span>A2UI v0.9 renderer</span>
        <span>{surfaces.length} surface</span>
      </div>
      <div
        style={{
          marginTop: 8,
          color: "#c8d0da",
          fontSize: 11,
          lineHeight: 1.45,
        }}
      >
        <MarkdownContext.Provider value={renderMarkdown}>
          {surfaces.map((surface) => (
            <A2uiSurface key={surface.id} surface={surface} />
          ))}
        </MarkdownContext.Provider>
      </div>
    </div>
  );
}
