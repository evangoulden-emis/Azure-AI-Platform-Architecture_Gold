# Initial control matrix

This is the minimum control set for the first governed workload. The control
owner must attach implementation evidence before production approval.

| Control | Implementation intent | Evidence | Owner |
| --- | --- | --- | --- |
| Identity | Entra tokens for users and applications; managed identity for Azure resources | App registration, RBAC matrix, access review | Platform security |
| Workload isolation | APIM product and resource boundary per workload; no shared secrets | Workload registry, APIM policy, IaC plan | AI platform |
| Residency | UK/EU region and service allow-list enforced in modules and policy | Region policy test, resource inventory, backup review | Data protection |
| Sensitive data | Classification at ingestion and request boundary; redact before telemetry | Redaction tests, classification mapping, sample traces | Data protection |
| Independent AI inspection | CrowdStrike AIDR runs inline at APIM; native safety remains a second layer | APIM policy export, AIDR test result, fail-open/fail-closed decision | Security operations |
| Prompt injection | AIDR, native input policy, retrieval constraints, and tool allow-lists; fail closed for untrusted tool instructions | Attack test set, policy version, exception log | Responsible AI |
| Model and agent approval | APIM logical routes map only to evaluated Azure AI Foundry deployments | Foundry registry, evaluation report, APIM route export, change record | AI platform |
| Retrieval security | Index access scoped to workload and source authorization | ACL propagation test, deletion test, query audit | Data platform |
| Tool safety | Tool registry with schemas, owner, classification, timeout, and kill switch | Registry export, contract tests, incident runbook | Integration engineering |
| Observability | Correlation ID and OpenTelemetry spans without raw prompt/response bodies by default | Trace sample, dashboard, alert test | SRE |
| Cost | Token metering, quotas, rate limits, and team attribution | Usage report, quota test, budget alert | Cloud economics |
| Change control | IaC and policy changes promoted through CI/CD with approval | Pipeline run, policy scan, approval record | Cloud engineering |
| Resilience | Timeouts, retries, circuit breakers, and a provider outage runbook | Failure test, RTO/RPO record, runbook | SRE |
| Human oversight | Escalation path for high-impact or low-confidence outcomes | Workflow design, queue owner, sample review | Business owner |
| Retention | Explicit retention for source, derived, audit, and evaluation data | Data inventory, retention configuration, deletion evidence | Records management |
| Egress and forwarding | ZIA enforces approved AI destinations, TLS inspection, tenant restrictions, and headers; ZCC/ZPA paths use matching Client Forwarding Policies; SIPA bypasses are explicit | Route test by traffic origin, ZIA/ZPA policy export, exception owner | Network security |
| Incident response | Security signals route into existing enterprise operations | CrowdStrike AIDR / Zscaler mapping, response playbook | Security operations |

## Evidence rule

An item is not `Compliant` because a service exists. It is compliant only when
the control is implemented, tested, owned, and has current evidence.

Evidence should be collected from credentialed service state, normalised into a
structured representation, and evaluated against versioned rules. Manual
screenshots may support a review but are not the primary control mechanism.