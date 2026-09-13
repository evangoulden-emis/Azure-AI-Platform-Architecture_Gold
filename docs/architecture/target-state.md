# Target-state architecture

## 1. Purpose

Northstar is a governed internal AI platform for product teams building
search, summarisation, extraction, copilots, and workflow automation. It gives
teams a repeatable path from an Entra-authenticated application request to a
measured model response without making each team independently solve identity,
data protection, safety, observability, quota, and provider integration.

The platform has two contracts:

1. **The platform contract** — what a team receives when it onboards:
   identity, model access, retrieval, policy enforcement, telemetry, quotas,
   deployment templates, and support boundaries.
2. **The model gateway contract** — the stable API that applications call.
   Provider SDKs do not cross this boundary.

## Confirmed strategic direction

- **Model and agent platform:** Azure AI Foundry.
- **Identity:** Entra ID for people and workload identities, with Conditional
  Access and managed identity.
- **Enterprise integration:** Boomi for integration entry, subscriptions, and
  cross-domain orchestration.
- **AI-serving boundary:** Azure APIM for token-aware routing, quotas, semantic
  caching where approved, and model-specific policy.
- **Independent AI guardrail:** CrowdStrike AIDR inline at the gateway; native
  provider safety remains an additional layer rather than a replacement.
- **Network security:** Zscaler ZIA for approved egress, TLS inspection, tenant
  restrictions, and header policy.
- **Observability:** OpenTelemetry-compatible traces into Dynatrace and
  security/audit events into the enterprise SIEM.
- **Delivery:** Terraform modules and code-based environment promotion.

## 2. Goals

- Repeatable onboarding for new users, developers, and workloads.
- Central enforcement of identity, data handling, safety, cost, and residency.
- UK/EU data boundary by policy, not by team convention.
- Provider choice without application rewrites.
- Serverless-first execution with an explicit escape hatch for long-running or
  custom workloads.
- Evidence that can be shown to security, data protection, and audit teams.
- OpenTelemetry-compatible traces that join application, retrieval, policy, and
  model events.

## 3. Non-goals for the first release

- Building a general-purpose autonomous agent platform.
- Allowing unrestricted model or tool access from product code.
- Creating a new enterprise integration bus when Boomi already owns a flow.
- Allowing an unapproved Foundry model family or deployment route before
  evaluation and residency approval.
- Moving regulated source systems into the AI platform.
- Replacing CrowdStrike AIDR, Dynatrace, Zscaler, or Entra.

## 4. Reference architecture

### 4.1 Experience and access

Applications, internal tools, and approved channels authenticate with Entra ID.
Boomi is the enterprise integration and subscription-governance entry where
the flow crosses domains or uses the existing integration fabric. APIM is the
stable AI-serving contract boundary. It performs:

- token validation and application identity resolution;
- subscription/product mapping and quota policy;
- correlation ID creation and propagation;
- request size, content-type, and rate-limit checks;
- routing to the platform runtime;
- consistent error and version handling.

No product team should call Azure AI Foundry or another model provider
directly.

### 4.2 Orchestration and policy

The orchestration layer runs on Azure Functions for short-lived work and
Durable Functions or Container Apps for workflows that need checkpoints,
retries, or longer execution. It coordinates:

1. request validation;
2. user and workload authorization;
3. data classification and sensitive-data handling;
4. retrieval, where requested;
5. model or agent selection through the APIM AI gateway;
6. output policy checks;
7. response shaping and audit emission.

Policy is split into:

- **deterministic platform policy:** identity, region, quotas, allowed models,
  tool allow-lists, retention, and redaction rules;
- **AI safety policy:** prompt injection checks, content safety, groundedness,
  output filtering, and human escalation rules;
- **application policy:** domain instructions and business workflow rules owned
  by the workload team.

The first two categories are platform-owned. Application policy is versioned
and reviewed as part of the workload.

### 4.3 Model gateway

APIM exposes the versioned model and agent contract. It resolves a logical
route to an approved Azure AI Foundry deployment based on workload policy,
region, capacity, quality tier, and cost budget. It owns:

- approved model and deployment registry;
- retry and timeout policy;
- token and latency metering;
- content safety hooks;
- provider-specific request translation;
- fallback rules that are explicit and auditable;
- provider outage and circuit-breaker state.
- inline CrowdStrike AIDR request/response inspection;
- approved semantic caching and load-balancing policy.

Model responses are not stored by default. If a workload requires response
retention, it must declare the purpose, retention period, access policy, and
region in its registration.

### 4.4 Data and retrieval

The platform separates source content from derived AI indexes:

- **Source zone:** Blob Storage / ADLS Gen2, owned by the data domain.
- **Processing zone:** serverless ingestion, classification, malware scanning,
  parsing, chunking, redaction, and embedding generation.
- **Retrieval zone:** Azure AI Search or the approved regional search service,
  containing only the fields and derived representations approved for search.
- **Metadata and governance:** source ID, owner, classification, region,
  consent/retention state, checksum, version, and deletion status.

Deletion must flow from the source record to chunks, embeddings, indexes,
caches, and derived evaluation sets. A vector index is not the system of
record.

### 4.5 Enterprise integration

Boomi owns enterprise integration entry, subscription governance, cross-domain
processes, file movement, and orchestration already governed by the integration
team. APIM owns the AI-serving plane: model and agent contracts, token-aware
rate limiting, routing, caching, AIDR enforcement, and Foundry integration.

Whether Boomi must be the front door for every AI API, including direct
application-to-APIM calls within Azure, remains an explicit ownership decision.
The architecture does not duplicate policy in both products: every control has
one enforcement point and one evidence owner.

The platform does not allow arbitrary outbound calls from prompts or tools.
Each tool is a registered capability with an owner, schema, allowed data
classification, timeout, audit event, and kill switch.

### 4.6 Trust and operations

Every request carries a correlation ID and workload ID. The platform emits
structured events for:

- authorization and policy outcomes;
- retrieval sources and retrieval quality signals;
- model route, latency, tokens, cost estimate, and safety result;
- tool invocation and result classification;
- human escalation and final outcome.

OpenTelemetry is the instrumentation boundary and Dynatrace is the operational
consumer. CrowdStrike AIDR is an independent inline guardrail at APIM for
Azure-hosted traffic. Zscaler ZIA provides egress enforcement, TLS inspection,
tenant restrictions, and approved header policy. Security and audit events are
forwarded to the enterprise SIEM.

Zscaler routing must be designed by traffic origin, not represented as one
generic egress hop:

- ZIA forwarding rules apply when the connection originates from the Zscaler
  Service Edge.
- Traffic originating from Zscaler Client Connector with ZPA enabled follows
  ZPA Client Forwarding Policies.
- Any SIPA bypass must have a corresponding identity, destination, environment,
  and policy owner. ZIA and ZPA policy changes must be reviewed together.

Known cloud-connector endpoints belong in environment configuration and network
policy evidence rather than being embedded in the logical architecture.

## 5. Data flow: governed model request

1. The application obtains an Entra token and calls APIM.
2. APIM validates the token, maps the workload, applies quota, and adds a
   correlation ID.
3. The runtime verifies the workload's allowed data classification, model
   route, and tools.
4. Input policy runs redaction and prompt-injection checks.
5. If retrieval is requested, the runtime queries only the workload's allowed
   index and records source IDs, not raw sensitive content in telemetry.
6. APIM resolves the logical route to an approved regional Azure AI Foundry
   model or agent deployment.
7. APIM applies AIDR inspection, provider translation, native safety checks,
   timeout, retry, caching policy, and metering.
8. Output policy checks the response and either returns it, transforms it, or
   escalates it.
9. APIM returns the versioned response and the platform emits audit and
   operational events.

## 6. Data boundary

The default deployment is private-by-default:

- approved UK/EU Azure regions only;
- private endpoints for storage, search, secrets, and model services where
  supported;
- no unrestricted public model or storage endpoints;
- Zscaler-controlled egress for approved external destinations;
- region and service allow-lists enforced in IaC and CI;
- logs and traces classified as platform data, with prompt and response bodies
  excluded by default;
- backup and disaster recovery locations explicitly reviewed before release.

Outbound paths must be tested separately for platform workloads, administrative
users, and ZCC/ZPA users because they do not necessarily traverse the same
Zscaler forwarding policy.

The exact primary/secondary region pair is **TBC**. It must be selected after
checking service availability, resilience requirements, and data protection
advice.

## 7. Environments and isolation

| Environment | Purpose | Isolation |
| --- | --- | --- |
| Development | Platform and workload development | Separate subscription or resource group, non-production data only |
| Test | Integration, safety, quality, and load testing | Separate data and model deployments; synthetic or approved masked data |
| Production | Approved workloads | Separate subscription/resource group, private networking, production policy |

Each environment receives the same modules and policy interfaces. Values,
secrets, capacity, and approved workload registrations vary by environment.
Production promotion is an artifact promotion, not a manual reconfiguration.

## 8. Repeatable developer path

An onboarded team receives:

1. a workload registration with owner, purpose, classification, region,
   Foundry model/agent route, data indexes, tools, quota, and retention;
2. a repository template for the runtime and evaluation set;
3. a Terraform composition that creates only the approved workload boundary;
4. the required Boomi subscription/integration entry and APIM AI product
   configuration;
5. dashboards, alerts, runbook links, and an operational owner;
6. CI gates for dependency security, IaC policy, prompt/evaluation quality,
   secret scanning, and deployment approval.

The platform team owns the paved road. The workload team owns domain
instructions, source-data quality, business acceptance, and human escalation.

## 9. Compliance evidence architecture

Controls are evaluated from collected state rather than self-declared service
configuration:

1. read current state through a credentialed API, CLI, policy export, or
   supported connector;
2. normalise provider-specific output into structured JSON;
3. evaluate a versioned rule set with a named owner and severity;
4. store the result, collection time, target, rule version, and evidence hash;
5. publish exceptions and remediation ownership to the operational system of
   record.

This pattern applies to Azure Policy, APIM configuration, Entra application
registrations, Zscaler forwarding policy, retrieval deletion, model registry
approval, and telemetry configuration. Evidence collectors are read-only and
run with least privilege.

## 10. Ninety-day delivery sequence

### Days 0–30 — foundation

- Confirm platform ownership and the Boomi/APIM responsibility boundary.
- Define governance intake and workload registration.
- Build the Terraform baseline for APIM and Azure AI Foundry.
- Define Entra identities, private networking, secrets, and evidence contracts.

### Days 31–60 — non-production guardrails and pilots

- Deploy APIM with inline CrowdStrike AIDR in non-production.
- Connect approved Foundry model deployments.
- Deliver pilot use cases with retrieval, evaluation, and Dynatrace telemetry.
- Use an AWS API Gateway/Lambda AIDR adapter only as a temporary governed
  exception for existing AWS workloads.

### Days 61–90 — production and catalogue governance

- Promote approved pilots to production.
- Complete operational dashboards, SIEM forwarding, alerts, and runbooks.
- Publish model, agent, API, MCP/tool, and workload registrations in the
  service catalogue.
- Open the first supported onboarding path to delivery teams.

## 11. Decisions required before provisioning production

- Approved Azure AI Foundry model families, deployment routes, and any external
  provider exception or fallback policy.
- Exact UK/EU primary and disaster-recovery regions.
- Azure messaging/eventing standard for asynchronous work.
- Data classification taxonomy and the list of classes allowed for prompts,
  retrieval, embeddings, and telemetry.
- Whether Azure AI Search is the default retrieval service.
- Whether Boomi is mandatory for every AI API or only enterprise integration
  and cross-domain flows.
- Per-use-case AIDR and sensitive-data action: block, redact, transform, or
  allow with audit.
- Long-term AWS equivalent for APIM inline AIDR enforcement; the Lambda SDK
  adapter is temporary.
- ZIA/ZPA policy ownership, platform traffic origin, SIPA use, and the required
  Client Forwarding Policies for each environment.
- Dynatrace tenant, trace retention, dashboard ownership, and alert routing.
- Workload onboarding authority and production change approval.