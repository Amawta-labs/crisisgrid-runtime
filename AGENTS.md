<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## CrisisGrid protocol requirement

The hackathon protocol layer is mandatory, not cosmetic. Keep these integrations real and build-verified:

- `src/app/providers.tsx` mounts the real CopilotKit provider.
- `src/app/api/copilotkit/route.ts` exposes the CopilotKit runtime endpoint.
- `src/app/api/runtime/ag-ui/route.ts` exports CrisisGrid orchestration as `@ag-ui/core` events.
- `src/app/api/runtime/a2ui/route.ts` exports A2UI v0.9 messages.
- `src/components/crisisgrid/protocol/A2UIProtocolSurface.tsx` mounts `MessageProcessor` + `A2uiSurface`.

Do not replace this with static badges or mocked claims. The cinematic UI can still use the local component registry, but protocol wiring must remain inspectable.
