# enlivio AI Platform Blueprint

An operational cockpit for designing and governing a repeatable Azure AI platform.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/ai-platform-blueprint` — responsive architecture cockpit and decision log
- `artifacts/api-server/src/routes/platform.ts` — platform overview, capability, control, roadmap, and decision APIs
- `lib/api-spec/openapi.yaml` — source of truth for the platform API contract
- `lib/db/src/schema/architecture-decisions.ts` — persisted decision status model
- `lib/api-client-react/src/generated` — generated client hooks; regenerate from OpenAPI after contract changes

## Architecture decisions

- Azure AI Foundry is the strategic platform for approved models and agents; individual model families and fallback routes remain governed decisions.
- Entra is the existing identity authority and is not provisioned by this repository. Terraform consumes existing Entra tenant, application, and managed-identity IDs via variables or GitHub configuration; Boomi owns enterprise integration entry/governance; APIM owns the token-aware AI-serving and policy boundary.
- CrowdStrike AIDR is an independent inline guardrail, Zscaler governs egress, Dynatrace receives operational telemetry, and Terraform is the IaC standard.
- Architecture decision statuses persist in PostgreSQL so the decision log remains an agreement surface across reloads.
- The API contract is OpenAPI-first; generated React Query hooks are the only frontend API surface.
- The frontend uses a fixed desktop navigation shell so the primary workspace remains visible while the user moves through the blueprint.

## Product

Users can review platform readiness, inspect capability layers, filter governance controls, sequence delivery phases, and update architecture decision status. The initial content is a deliberately small reference baseline for the Azure enterprise stack and should be replaced or extended with approved service and control evidence.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before using generated hooks or schemas.
- `lib/api-client-react` needs `dom.iterable` in its TypeScript library list because the generated fetch client reads `Headers.entries()`.
- Use the managed artifact workflows for preview; do not start artifact dev servers from the workspace root.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
