# CrisisGrid Runtime Stack Notes

## Installed protocol/framework layer

Installed on 2026-05-09:

- `@a2ui/react` `0.9.1`
- `@a2ui/web_core` `0.9.2`
- `@ag-ui/core` `0.0.53`
- `@ag-ui/client` `0.0.53`
- `@ag-ui/mcp-apps-middleware` `0.0.3`
- `@copilotkit/react-core` `1.57.1`
- `@copilotkit/react-ui` `1.57.1`
- `@copilotkit/runtime` `1.57.1`
- `@copilotkit/a2ui-renderer` `1.57.1`
- `@mcp-ui/client` `7.1.0`
- `@mcp-ui/server` `6.1.0`
- `@modelcontextprotocol/sdk` `1.29.0`
- `@daytona/sdk` `0.173.0`
- `@langchain/core` `1.1.45`
- `@langchain/google-genai` `2.1.30`
- `langchain` `1.4.0`
- `langsmith` `0.6.3`
- `ai` `6.0.177`
- `@ai-sdk/google` `3.0.71`
- `zod` `3.25.76`
- `maplibre-gl` `5.24.0`
- `react-map-gl` `8.1.1`
- `@deck.gl/react` `9.3.2`
- `@deck.gl/core` `9.3.2`
- `@deck.gl/layers` `9.3.2`
- `@deck.gl/mapbox` `9.3.2`
- `@turf/turf` `7.3.5`
- `zustand` `5.0.13`
- `lucide-react` `1.14.0`
- `framer-motion` `12.38.0`
- `recharts` `3.8.1`
- `sonner` `2.0.7`

## Local environment

- `NEXT_PUBLIC_MAPBOX_TOKEN` is stored in `.env.local`.
- `DAYTONA_API_KEY` is stored in `.env.local`.
- `DAYTONA_API_URL` is stored in `.env.local` and points at the Daytona cloud API.
- `GOOGLE_GENERATIVE_AI_API_KEY` and `GOOGLE_API_KEY` are stored in `.env.local` for Gemini via AI SDK and LangChain.
- `LANGSMITH_TRACING`, `LANGSMITH_ENDPOINT`, and `LANGSMITH_PROJECT` are configured in `.env.local`.
- `LANGSMITH_API_KEY` is still required to export traces to LangSmith.
- `.env*` is ignored by `.gitignore`; do not move tokens into committed files.

## UI foundation

shadcn was initialized with the Radix/Nova preset. The following components are installed:

- `button`
- `card`
- `badge`
- `tabs`
- `sheet`
- `dialog`
- `alert`
- `input`
- `textarea`
- `select`
- `scroll-area`
- `table`
- `separator`
- `dropdown-menu`
- `progress`
- `tooltip`

## Protocol integration requirement

- **A2UI**: Google protocol/packages for agent-generated interactive UI. It must be mounted in the app through the real `@a2ui/web_core` `MessageProcessor` and `@a2ui/react` `A2uiSurface` renderer, not only described as an inspiration.
- **AG-UI**: event protocol for connecting agent backend and frontend UI. CrisisGrid runtime events must be exportable as real `@ag-ui/core` events.
- **CopilotKit**: React/Next framework for embedding copilots, frontend tools, shared state and generative UI. The app must wrap the runtime with the real CopilotKit provider and expose a Copilot Runtime endpoint.
- **MCP Apps / MCP UI**: interactive UI resources and middleware for UI-enabled tools.

Current local endpoints:

- `/api/copilotkit`: CopilotKit runtime endpoint plus GET metadata for demo inspection.
- `/api/runtime/ag-ui`: AG-UI event envelope generated from the CrisisGrid orchestration.
- `/api/runtime/a2ui`: A2UI v0.9 message list generated from the UI Planner surface.

## Product pivot

CrisisGrid is no longer framed as a generic crisis dashboard. It is a Chile-born operational runtime for continuous physical disasters:

- earthquakes,
- tsunamis,
- wildfires,
- volcanoes,
- floods and mudflows,
- storm surges,
- isolated mountain/coastal zones,
- seismic critical infrastructure.

Technical implication: the UI spec must be disaster-physics-aware. A wildfire plan should not render the same surface as an earthquake, tsunami or volcanic ash event.

Core runtime promise:

```txt
fragmented multimodal signals -> disaster physics classification -> specialized operational UI -> gated tool action
```

## Local priority

Do not mock the partner protocols in the final demo. The core CrisisGrid contract remains:

```txt
signals -> agent/runtime -> typed events -> validated UI spec -> component registry -> rendered operational surface
```

The local Zod-validated `UiPlan` renderer is still the main cinematic surface, but the final demo must show that CopilotKit, AG-UI and A2UI are wired as real runtime contracts.

## Agent-controlled UI runtime

CrisisGrid components are owned by the runtime, not by fixed pages. Agents and tools mutate the UI through typed events:

- `signal.received`
- `agent.handoff`
- `ui.component.added`
- `ui.component.updated`
- `map.layer.added`
- `tool.started`
- `tool.completed`
- `gate.required`
- `gate.approved`

Protocol mapping:

```txt
A2A-style events: agent.handoff
AG-UI-style events: signal/tool/gate/ui runtime stream
A2UI-style specs: UiComponent entries in UiPlan
Daytona: isolated tool execution that returns artifacts
AI SDK + Gemini: structured output and tool-calling engine
```

The demo claim is:

```txt
Agents do not fill a dashboard. They mutate an operational UI through typed events.
```

## Visual verification layer

Cameras are not the primary source of truth in CrisisGrid. They are the human visual verification layer between institutional signals and operational decisions.

Primary sources provide objective signals:

- CSN-style seismic events.
- SHOA-style tsunami/coastal risk.
- CONAF-style wildfire/smoke events.
- Traffic and urban sensor disruptions.

The `camera_agent` uses event location and disaster type to surface nearby feeds. Those feeds are then attached to generated UI and approval gates:

```txt
objective signal -> nearby cameras -> human visual check -> CivicGate decision
```

This makes camera feeds part of HITL, not decoration. A sensitive tool action should be able to reference visual evidence before approval.

## Daytona integration

`/api/tools/daytona-run` executes the CrisisGrid tools through the Daytona TypeScript SDK when `DAYTONA_API_KEY` is present:

- `simulate_disaster_physics`
- `compile_operational_plan`
- `generate_public_alert_packet`

The current implementation creates an ephemeral TypeScript sandbox, runs the selected tool, parses a structured `CRISISGRID_RESULT` payload, deletes the sandbox, and returns the artifact to the UI runtime.

If Daytona fails during the demo, the endpoint falls back to the local tool contract so the UI flow remains intact while logging the Daytona failure.

## LangChain / LangSmith planner

`/api/agent/langchain-plan` runs the CrisisGrid UI Planner through LangChain with Gemini and validates the result locally with Zod.

The planner receives:

- the current scenario,
- the component bank from `src/lib/ui-registry/component-bank.ts`,
- CrisisGrid rules about visual verification and HITL gates.

It returns:

- incident class,
- severity,
- operator brief,
- required evidence,
- A2A-style handoffs,
- recommended Daytona tool,
- component types to render,
- public-decision risk.

`/api/agent/orchestrate` uses this planner decision to shape the event timeline, while keeping a deterministic fallback for demo resilience.

LangSmith tracing is wired through `langsmith/traceable`. It becomes active when `LANGSMITH_API_KEY` is present.

## Verification

After installation:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

All passed.

Note: the default scaffold was adjusted to avoid build-time Google Fonts downloads and to set the Turbopack root to this app directory.
