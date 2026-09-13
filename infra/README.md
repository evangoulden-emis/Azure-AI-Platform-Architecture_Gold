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
must establish APIM and Azure AI Foundry modules, then add Entra, private
networking, AIDR policy, observability, and workload compositions. Bicep may be
used only where an Azure capability cannot be operated reliably through the
approved Terraform provider, and the exception must have an owner and drift
strategy.

## Provisioning boundary

This repository contains the design and module plan only. It must not be
connected to a production Azure subscription until the decisions in
`docs/architecture/target-state.md` are approved and the platform security
review is complete.