# enlivio AI Platform Architecture Pack

This pack is the source of truth for the proposed enterprise AI platform. The
web cockpit in `artifacts/ai-platform-blueprint` is a review surface for this
design; it is not a replacement for the design.

## Contents

- [Target-state architecture](./target-state.md)
- [Logical architecture](./logical-architecture.mmd)
- [Deployment topology](./deployment-topology.mmd)
- [Control matrix](./control-matrix.md)
- [Model gateway contract](./api-contract.md)
- [Architecture source map](./source-map.md)
- [Infrastructure module plan](../../infra/README.md)

## Status

This is a **reference architecture for approval**, not a claim that Azure
resources have already been provisioned. Items marked `TBC` require decisions
from the enterprise security, data protection, cloud engineering, and product
owners.

## Working assumptions

- Azure is the strategic cloud.
- Workloads use serverless or managed compute by default.
- Entra ID is the workforce and workload identity authority.
- Azure AI Foundry is the strategic corporate platform for approved models and
  agents.
- Boomi provides enterprise integration entry, subscription governance, and
  cross-domain orchestration. APIM owns the AI-serving contract and token-aware
  AI policy.
- Data, prompts, embeddings, telemetry, and backups remain in approved UK/EU
  regions.
- Model families and deployment routes remain subject to evaluation,
  data-processing, commercial, and residency review inside Azure AI Foundry.

## Enterprise context incorporated

Accessible Notion material was reviewed for relevant enterprise standards. It
confirmed that Zscaler forwarding behaviour depends on the traffic origin:
ZIA forwarding rules apply to connections originating from the Zscaler Service
Edge, while ZCC/ZPA flows require corresponding ZPA Client Forwarding Policies,
including any SIPA bypass. It also established a useful compliance pattern:
collect credentialed state, normalise it to structured data, and evaluate
versioned rules.

The broader AI workspace establishes Azure AI Foundry, Entra, Boomi, APIM,
CrowdStrike AIDR, Zscaler ZIA, Dynatrace, and Terraform as the strategic
direction. It also records open questions that this pack keeps visible rather
than silently resolving.