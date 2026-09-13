# Governed workload pilot

## Scope and claim

The `claims-assistant` pilot is a representative **non-production control-plane
simulation** of the governed request path. It proves the versioned platform
contract, enforcement sequence, evidence shape, and failure behavior without
claiming that tenant-specific Azure, CrowdStrike, Zscaler, Dynatrace, or SIEM
connections are live. Credentialed configuration exports and route tests remain
mandatory before production approval.

## Workload registration

| Field | Approved value |
| --- | --- |
| Workload | `claims-assistant` |
| API | `POST /api/v1/responses` |
| Version | `2026-09-01` |
| Identity | Signed JWT with issuer, audience, expiry, application and role validation; workload resolved by gateway registry |
| Logical model route | `balanced` |
| Foundry deployment mapping | `approved-eu-balanced` |
| Retrieval index | `claims-knowledge` |
| Tools | None |
| Quota | 5 requests/minute/application identity |
| Data | Synthetic non-production claim notes |

Boomi owns subscription entry and cross-domain orchestration. APIM owns this
versioned AI response boundary, workload resolution, quota, inline AIDR,
logical model routing, and stable errors.

## Evaluation and acceptance

Run `pnpm --filter @workspace/api-server test`. The suite covers a normal
request, fabricated and expired identities, workload impersonation, injection,
output limits, six requests in one minute, and authorized retrieval deletion.
Acceptance requires:

- valid signed identity claims and API version for a completed response;
- the logical route never exposes or accepts a provider deployment name;
- every retrieval result has an authorized source ID and title;
- injection text returns `SAFETY_BLOCKED`;
- request six returns `QUOTA_EXCEEDED` with `retry-after`;
- deletion requires the registered pilot administrator role and returns zero
  post-delete matches;
- the structured request event says `raw_content_logged: false`;
- the response and telemetry use the same correlation ID.

The normalized evidence register is available at
`GET /api/platform/pilot/evidence`. Each record includes collection time,
target, rule version, owner, summary, and SHA-256 evidence hash.

## Failure behavior

| Failure | Stable outcome | Default |
| --- | --- | --- |
| Missing/invalid identity | `WORKLOAD_NOT_APPROVED` | Fail closed |
| Wrong API version | `PLATFORM_UNAVAILABLE` | Fail closed |
| Unapproved workload/route | `WORKLOAD_NOT_APPROVED` | Fail closed |
| Wrong index or missing citations | `RETRIEVAL_ACCESS_DENIED` | Fail closed |
| Prompt injection signal | `SAFETY_BLOCKED` | Fail closed |
| Quota exhausted | `QUOTA_EXCEEDED` | Reject with retry interval |
| No authorized retrieval source | `RETRIEVAL_ACCESS_DENIED` | Fail closed |

There is no silent model fallback and no AIDR fail-open mode in the pilot.

## Telemetry and evidence

The operational event is suitable for OpenTelemetry export to Dynatrace and a
mapped security event to SIEM. It contains correlation ID, workload ID, hashed
application identity, logical route, approved deployment alias, AIDR outcomes,
Zscaler policy outcome, retrieval source IDs, and token counts. Authorization,
raw prompts, raw responses, and source content are excluded by default.

Production evidence must replace simulated outcomes with read-only exports from
Entra, APIM, Foundry, AIDR, Zscaler, Dynatrace, SIEM, and the retrieval service.

## Rollback and operations

1. Disable the pilot APIM product/subscription to stop new calls.
2. Remove the logical route mapping; do not repoint it to an unapproved model.
3. Revoke the pilot application assignment and managed-identity roles.
4. Purge pilot index content, derived chunks, embeddings, and caches.
5. Preserve correlation-safe audit evidence for the approved retention period.
6. Confirm Dynatrace and SIEM no longer receive pilot traffic, then close the
   change record.

The AI platform owner operates the route; Security Operations owns AIDR and
SIEM response; SRE owns traces and alerts; Data Platform owns retrieval and
deletion; Network Security owns the ZIA/ZPA route evidence.