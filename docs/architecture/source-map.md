# Architecture source map

The architecture was reconciled against the user's AI workspace in Notion on
13 September 2026. The source material remains in Notion; this file records
design provenance without copying the source documents into the repository.

## Primary sources

| Source | How it is used |
| --- | --- |
| Enterprise AI Infrastructure — High-Level Target Architecture | Strategic target state and 0–30 / 31–60 / 61–90 delivery sequence |
| Enterprise AI-Serving Architecture: Boomi, Azure API Management and Azure AI Foundry | Boomi/APIM plane separation and Foundry serving design |
| APIM, AI & Securing the AI Estate | APIM policy boundary, AI traffic controls, and security architecture |
| AI architecture and security — CrowdStrike, agents, and API strategy | Foundry agent strategy, AIDR, and API ownership context |
| AI infrastructure strategy — gateway, Lambda integration, and CrowdStrike AIDR setup | Azure target and temporary AWS guardrail exception |

## Supporting sources

| Source | How it is used |
| --- | --- |
| AI infrastructure and guardrails — AWS Bedrock, Azure setup, and security controls | Cross-cloud exception and guardrail comparison |
| AI Foundry setup, Claude org migration, and API governance | Foundry and provider-governance context |
| Azure APIM and MCP | MCP exposure through the governed API boundary |
| Integration Acceptance Pipeline — Boomi | Enterprise integration acceptance and delivery controls |
| Zscaler SIPA and Forwarding | Traffic-origin-specific ZIA/ZPA forwarding behaviour |
| Network Compliance | Structured, versioned evidence-collection pattern |

## Confirmed versus unresolved

Confirmed strategic direction is captured in
`docs/architecture/target-state.md`. The following remain unresolved because
the source material presents them as questions or exceptions:

- whether Boomi is mandatory in front of every AI API;
- the permanent AWS guardrail equivalent to APIM inline AIDR;
- whether sensitive-data and AIDR findings block, redact, transform, or allow
  with audit for each workload;
- the exact UK/EU production and disaster-recovery region pair;
- the approved model families and fallback rules inside Azure AI Foundry.