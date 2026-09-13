# Repeatable infrastructure plan

The platform should be provisioned from versioned modules, with the same
composition promoted through development, test, and production.

## Recommended module boundaries

```text
infra/
  modules/
    landing-zone/
    private-network/
    api-management/
    ai-runtime/
    model-gateway/
    retrieval/
    observability/
    compliance-evidence/
    workload/
    policy/
  environments/
    dev/
    test/
    prod/
```

Each module should expose a small contract and avoid embedding workload
business logic. The `workload` composition should accept:

- workload ID and owner;
- data classification and approved regions;
- logical model routes;
- retrieval index declarations;
- tool capabilities;
- quota and budget;
- retention and audit requirements.

The `compliance-evidence` boundary should deploy read-only collectors, a
normalised evidence schema, scheduled evaluation, and findings export. Zscaler
evidence must distinguish Service Edge-originated ZIA routing from ZCC/ZPA
Client Forwarding Policy behaviour.

## CI/CD gates

1. format, validate, and plan;
2. static security and dependency scan;
3. region/service allow-list policy;
4. secret and sensitive-data scan;
5. policy unit tests;
6. model and retrieval evaluation gates;
7. approval for production plan;
8. deployment with drift detection and rollback metadata.

## Authoring standard

Terraform is the primary module authoring standard. The first 30-day baseline
must establish APIM and Azure AI Foundry modules integrated with the existing
Entra tenant, then add private
networking, AIDR policy, observability, and workload compositions. Bicep may be
used only where an Azure capability cannot be operated reliably through the
approved Terraform provider, and the exception must have an owner and drift
strategy.

## Provisioning boundary

The development composition in `environments/dev` is deployable. There is
deliberately no production composition. The root module rejects production-like
environment names and requires the caller to provide the expected non-production
subscription ID; a precondition compares it with the authenticated subscription.

## Development deployment

Prerequisites:

- Terraform 1.8 or newer;
- Azure CLI authentication to a dedicated non-production subscription;
- an Azure subscription tag `environment=dev`, `development`, or
  `non-production`;
- existing Entra application registrations and a user-assigned managed identity;
- permission to create Azure resource groups and assign Azure RBAC roles to the
  supplied existing managed identity;
- a reachable CrowdStrike AIDR inspection endpoint.

```bash
cd infra/environments/dev
cp terraform.tfvars.example terraform.tfvars
# Set subscription_id, the independently controlled non-production allow-list,
# tenant_id, existing Entra IDs, aidr_inspection_url and workload registrations.
terraform init
terraform validate
terraform plan -out dev.tfplan
terraform show -json dev.tfplan > dev.tfplan.json
python ../../policy/check_plan.py dev.tfplan.json ../../policy/allowlist.json
terraform apply dev.tfplan
```

The policy checker denies unknown Azure resource
types, unapproved locations, public access on protected data/AI services, and any
production-like environment tag.

CI validates all modules and runs positive and negative policy fixtures. Azure
planning is intentionally a separate authenticated deployment-stage concern:
CI policy does not silently fall back when a plan or allow-list is missing.

## Module contracts

- Entra is an external dependency: this repository does not create applications,
  service principals, federated credentials, app-role assignments, or managed
  identities. Existing IDs are passed through Terraform variables or GitHub
  environment variables; credentials, if ever required, belong in GitHub secrets.
- `private-network`: VNet, delegated subnets, and private DNS zones.
- `api-management`: private APIM gateway and workload-facing endpoint.
- `model-gateway`: versioned API plus fail-closed inline AIDR inspection policy.
- `ai-runtime`: private Azure AI Foundry account and project boundary.
- `key-vault`: RBAC-only private secrets boundary.
- `retrieval`: private ADLS Gen2 and Azure AI Search services.
- `observability`: Log Analytics, Application Insights, and diagnostic settings.
- `workload`: repeatable APIM product boundary linked to an existing Entra
  workload registration.
- `gateway-policy`: identity-derived workload, quota, route, retrieval, AIDR,
  and backend translation policy for the approved `/v1/responses` contract.

The development outputs return the APIM endpoint, supplied identity IDs, resource IDs,
private DNS zones, and a workload-onboarding map suitable for downstream
automation. APIM resolves workload policy from the validated Entra `azp` claim;
subscription keys are neither required nor created.