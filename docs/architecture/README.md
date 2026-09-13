# Northstar AI Platform Architecture Pack

This pack is the source of truth for the proposed enterprise AI platform. The
web cockpit in `artifacts/ai-platform-blueprint` is a review surface for this
design; it is not a replacement for the design.

## Contents

- [Target-state architecture](./target-state.md)
- [Logical architecture](./logical-architecture.mmd)
- [Deployment topology](./deployment-topology.mmd)
- [Control matrix](./control-matrix.md)
- [Model gateway contract](./api-contract.md)
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
- APIM is the public platform contract; Boomi remains the enterprise
  integration option where it is already the system of record for integration.
- Data, prompts, embeddings, telemetry, and backups remain in approved UK/EU
  regions.
- Model providers and model families remain TBC until the model evaluation,
  data-processing, commercial, and residency review is complete.

## Enterprise context incorporated

Accessible Notion material was reviewed for relevant enterprise standards. It
confirmed that Zscaler forwarding behaviour depends on the traffic origin:
ZIA forwarding rules apply to connections originating from the Zscaler Service
Edge, while ZCC/ZPA flows require corresponding ZPA Client Forwarding Policies,
including any SIPA bypass. It also established a useful compliance pattern:
collect credentialed state, normalise it to structured data, and evaluate
versioned rules.

The accessible material did not establish AI, APIM, Boomi, Dynatrace,
CrowdStrike, serverless, IaC, or data-residency standards. Those remain proposed
architecture decisions in this pack.