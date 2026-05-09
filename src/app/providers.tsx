"use client";

import { HttpAgent } from "@ag-ui/client";
import { CopilotKit } from "@copilotkit/react-core";
import { useMemo, type ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  const agents = useMemo(
    () => ({
      default: new HttpAgent({
        agentId: "default",
        description: "CrisisGrid AG-UI runtime bridge",
        url: "/api/runtime/ag-ui",
      }),
      crisisgrid: new HttpAgent({
        agentId: "crisisgrid",
        description: "CrisisGrid orchestrator event stream",
        url: "/api/runtime/ag-ui",
      }),
    }),
    [],
  );

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agents__unsafe_dev_only={agents}
      showDevConsole={false}
      enableInspector={false}
    >
      <TooltipProvider>{children}</TooltipProvider>
    </CopilotKit>
  );
}
