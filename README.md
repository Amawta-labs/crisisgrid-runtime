# CrisisGrid Runtime

Agent-controlled operational UI for Chilean physical disasters.

CrisisGrid is not an emergency dashboard with AI on top. It is a generative UI
runtime where agents mutate the interface through typed events as fragmented
signals arrive from sensors, cameras, social reports and tools.

Core thesis:

```txt
Chile lives on top of continuous natural disasters.
CrisisGrid transforms fragmented multimodal signals into operational interfaces
specialized for earthquakes, tsunamis, wildfires, volcanic events, mudflows and
urban cascade failures.
```

## Demo

Production:

- https://crisisgrid-runtime.vercel.app

What to watch in the 2-3 minute demo:

1. The app starts with no fixed dashboard loaded.
2. Agents read simulated CSN/SHOA/CONAF/Open-Meteo/camera/social signals.
3. The map moves to the operational focus.
4. UI components appear progressively as agent decisions, not as a static page.
5. The camera layer becomes human visual verification before public action.
6. CivicGate, XBroadcast and EmergencyDispatch require human approval before
   sensitive actions.
7. Operator target buttons switch the whole runtime to different disaster
   physics: Valparaiso tsunami watch, Valparaiso wildfire, Villarrica volcano,
   Cajon del Maipo mudflow, Santiago blackout or Vitacura earthquake.

## Why This Is Generative UI

The interface is not preselected by a route or tab. Agents emit runtime events:

```txt
signal.received
agent.handoff
ui.component.added
ui.component.updated
map.layer.added
tool.started
tool.completed
gate.required
gate.approved
```

Those events update a shared runtime state:

```txt
fragmented signals
  -> agent/orchestrator reasoning
  -> disaster physics classification
  -> typed runtime events
  -> validated UI component specs
  -> rendered operational surface
  -> gated tool action
```

The key product idea is that the UI changes because the disaster changes:

- Earthquake: visual verification, bridge/tunnel risk, inspection routing,
  congestion and public advisory gating.
- Tsunami watch: SHOA threshold, port cameras, coastal routes and evacuation
  language hold.
- Wildfire: wind, terrain, smoke reports, route staging and Bomberos gate.
- Volcano: ash dispersion, respiratory guidance, camera uncertainty and
  SENAPRED gate.
- Mudflow: rainfall, river gauge, bridge fragility, route closures and basin
  evacuation watch.
- Blackout: intersections, hospitals, public mobility advisory and X broadcast
  approval.

## Protocols And Frameworks

The hackathon protocol layer is wired into the repo, not only described in the
pitch.

| Layer | Implementation |
| --- | --- |
| A2UI | `@a2ui/web_core`, `@a2ui/react`, `@a2ui/markdown-it` |
| AG-UI | `@ag-ui/core`, `@ag-ui/client`, event adapter |
| CopilotKit | `@copilotkit/react-core`, `@copilotkit/react-ui`, `@copilotkit/runtime` |
| MCP UI | `@mcp-ui/client`, `@mcp-ui/server`, `@modelcontextprotocol/sdk` |
| Gemini | Vercel AI SDK and LangChain Google GenAI |
| Daytona | Tool execution through `@daytona/sdk` with local fallback |
| LangSmith | Optional tracing through `langsmith/traceable` |
| Validation | Zod schemas before render/tool execution |

Inspectable endpoints:

- `/api/copilotkit` - CopilotKit runtime endpoint.
- `/api/runtime/ag-ui` - AG-UI event envelope from the CrisisGrid runtime.
- `/api/runtime/a2ui` - A2UI v0.9 messages from the UI Planner surface.
- `/api/agent/orchestrate` - main event timeline builder.
- `/api/agent/langchain-plan` - Gemini/LangChain UI Planner.
- `/api/agent/voice-command` - Gemini operator voice intent parser.
- `/api/tools/daytona-run` - Daytona tool runner with structured artifacts.
- `/api/sources/[source]` - simulated source adapters for demo scenarios.

## Agent Architecture

Agents are represented as typed producers of evidence and UI mutations:

| Agent | Role |
| --- | --- |
| Orchestrator Agent | Receives all events, decides priority and coordinates handoffs. |
| Camera Verification Agent | Pulls nearby feeds to close the human visual verification loop. |
| Social Signal Agent | Reads citizen/social reports, rumors, contradictions and repetition. |
| Public API / Sensor Agent | Integrates CSN, SHOA, CONAF/NASA and weather-style hard signals. |
| Disaster Physics / Risk Agent | Interprets earthquake, wildfire, tsunami, volcano, mudflow or blackout behavior. |
| UI Planner Agent | Decides which components appear, move or disappear. |
| Gatekeeper Agent | Requires HITL for public alerts, dispatches and irreversible actions. |
| Tool Execution Agent | Runs Daytona/MCP/local tools and returns artifacts into the UI. |

Important separation:

```txt
A2A-style handoffs = agent.handoff events
AG-UI = agent/frontend runtime event contract
A2UI = declarative component message contract
Daytona = sandboxed tool execution
Gemini/AI SDK/LangChain = structured reasoning and tool selection
```

## Safety Model

This is a hackathon prototype. It does not contact real emergency services and
does not publish to real X/Twitter.

Sensitive flows are intentionally mocked and gated:

- `publish_public_alert_mock`
- `contact_emergency_services_mock`
- `navigate_map_to_target`
- `simulate_disaster_physics`
- `compile_operational_plan`
- `generate_public_alert_packet`

The UI makes the safety model explicit: XBroadcast, CivicGate and
EmergencyDispatch ask for operator approval and display why the action is being
offered.

## Visual Verification Layer

Cameras are not the source of truth. They are the human visual verification
layer between objective institutional signals and sensitive public decisions.

Expected loop:

```txt
institutional/sensor signal
  -> disaster type classification
  -> nearest cameras selected
  -> operator confirms visible evidence or absence of visible damage
  -> CivicGate allows approve, hold or reject
```

This is the core product move: the camera does not replace CSN, SHOA or CONAF.
It closes the loop between data and decision.

## Local Setup

```bash
pnpm install
pnpm dev
```

Open:

```txt
http://localhost:3000
```

If another local server is already running, Next.js may choose another port.

## Environment

Create `.env.local` from `.env.example` and fill only the keys you want to
exercise locally. The app has deterministic fallbacks for demo resilience.

```bash
cp .env.example .env.local
```

Required for the full visual/demo experience:

- `NEXT_PUBLIC_MAPBOX_TOKEN`

Optional integrations:

- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GOOGLE_API_KEY`
- `DAYTONA_API_KEY`
- `DAYTONA_API_URL`
- `LANGSMITH_API_KEY`
- `LANGSMITH_TRACING`
- `LANGSMITH_ENDPOINT`
- `LANGSMITH_PROJECT`

Never commit real tokens.

## Verification

Last verified locally with:

```bash
pnpm exec tsc --noEmit
pnpm lint
NEXT_PRIVATE_BUILD_WORKER=1 pnpm build
```

Browser checks performed with Playwright:

- `Valparaiso wildfire` moves the map, clears the previous surface and renders
  fire-specific route/dispatch components.
- `Santiago blackout` renders XBroadcast and Carabineros mock dispatch.
- `Villarrica volcano` renders progressively: central scenario first, dispatch
  later, proving staged agentic rendering.

## Repository Map

```txt
src/app/
  page.tsx                         main runtime entry
  providers.tsx                    CopilotKit + AG-UI provider wiring
  api/
    agent/orchestrate              main event timeline
    agent/langchain-plan           Gemini/LangChain UI planner
    agent/voice-command            operator voice intent parser
    copilotkit                     CopilotKit runtime endpoint
    runtime/ag-ui                  AG-UI protocol envelope
    runtime/a2ui                   A2UI message endpoint
    sources/[source]               source adapter simulation
    tools/daytona-run              Daytona tool execution

src/components/crisisgrid/
  CrisisGridRuntime.tsx            cinematic agent-controlled UI runtime
  components/MapCanvas.tsx         Mapbox/MapLibre operational map
  generated/GeneratedSurfaceStack  component registry renderer
  protocol/A2UIProtocolSurface.tsx A2UI renderer surface

src/lib/
  agentic/                         agents, orchestration, LangChain planner
  crisis/schemas.ts                Zod UI/event contracts
  daytona/tools.ts                 sandbox tool execution
  protocol/                        A2UI and AG-UI adapters
  runtime/                         runtime event reducer
  ui-registry/component-bank.ts    components available to the planner
```

## Judging Notes

Rubric alignment:

- Innovation and creativity: Chile-specific disaster-physics UI runtime, not a
  starter-kit clone.
- Technical implementation: real A2UI, AG-UI, CopilotKit, Gemini, Daytona and
  LangChain/LangSmith wiring with typed endpoints.
- Accuracy and reliability: deterministic fallback contracts, Zod validation,
  build/lint/type checks and HITL safety gates.
- User experience: cinematic, progressive rendering, map movement, visual
  verification and approval microinteractions.
- Scalability and impact: extensible event/component registry for additional
  disasters, regions, tools and institutional data sources.
