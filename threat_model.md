# Threat Model

## Project Overview

Northstar is a React and Express platform-governance cockpit backed by PostgreSQL through Drizzle. It presents Azure AI platform readiness, controls, roadmap items, and persisted architecture decisions. It also contains a non-production governed claims-workload simulation. The project is not currently deployed, but the API and web artifacts are designated deployment entry points.

## Assets

- **Governance decisions** — persisted status records guide platform delivery and must not be altered by unauthorized users.
- **Platform plans and control evidence** — capability, roadmap, control, and pilot evidence can reveal internal architecture and security posture.
- **Pilot retrieval sources** — simulated claims content must remain scoped to the approved workload and deletion privilege.
- **Workload credentials and application secrets** — bearer tokens, `SESSION_SECRET`, and `DATABASE_URL` protect API identity and database access.
- **Service availability and telemetry integrity** — API capacity and policy/audit events support reliable governance operations.

## Trust Boundaries

- **Browser or API client to Express** — every header, parameter, and body is attacker-controlled; sensitive reads and mutations require server-side access control.
- **Express to PostgreSQL** — the API can persist governance state, so handlers must validate input and prove authorization before queries or updates.
- **Pilot caller to governed workload** — bearer-token validation maps a registered application to a server-resolved workload and deletion capability.
- **Production to simulation** — pilot routes describe non-production behavior and must not be mistaken for actual Entra/APIM enforcement in a production workload.

## Scan Anchors

- Production API entry points: `artifacts/api-server/src/app.ts` and `src/routes/*`.
- Persistent sensitive action: architecture decision update in `src/routes/platform.ts`.
- Pilot authentication and authorization: `src/lib/pilot-auth.ts` and `src/routes/governed-workload.ts`.
- Browser entry point: `artifacts/ai-platform-blueprint/src/App.tsx`; generated network client is under `lib/api-client-react/src`.
- Database schema and connection: `lib/db/src`.
- `artifacts/mockup-sandbox` is development-only unless separate production reachability is demonstrated.

## Threat Categories

### Spoofing

Protected API operations must establish identity using a production-grade mechanism and must not rely on browser UI state. Pilot bearer tokens must retain signature, issuer, audience, expiry, application-registration, and role validation; simulated HMAC issuance must remain unavailable in production.

### Tampering

Architecture-decision status changes affect a durable agreement surface. Every mutation must require an authenticated, governance-authorized subject. Request schema validation alone does not authorize the action. Database operations must continue using parameterized ORM expressions.

### Information Disclosure

Platform and pilot evidence endpoints should be intentionally classified as public or protected. Responses and logs must exclude credentials, prompts, source content, connection details, and unnecessary internal evidence. Retrieval results must remain bound to the authenticated workload.

### Denial of Service

Public handlers must bound request bodies and computational/database work. Rate and quota controls should apply at the appropriate trusted identity or network boundary; state-seeding work should not be repeated on every list request in a mature production implementation.

### Elevation of Privilege

Administrative source deletion must remain bound to both workload identity and deletion capability. All current and future governance mutations must enforce roles server-side before selecting or modifying the target object; client-side buttons or allowed enum values are not authorization controls.
