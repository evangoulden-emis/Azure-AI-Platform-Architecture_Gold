#!/usr/bin/env python3
"""Static regression assertions for the end-to-end identity contract."""
from pathlib import Path

ROOT = Path(__file__).parents[1]
gateway = (ROOT / "modules" / "model-gateway" / "main.tf").read_text()
gateway_policy = (ROOT / "modules" / "gateway-policy" / "main.tf").read_text()
workload = (ROOT / "modules" / "workload" / "main.tf").read_text()
environment = (ROOT / "environments" / "dev" / "main.tf").read_text()

assert 'url_template        = "/v1/responses"' in gateway
assert "subscription_required = false" in gateway
assert 'authentication-managed-identity' in gateway_policy
assert 'client-id="${var.backend_identity_client_id}"' in gateway_policy
assert "<audience>${var.gateway_client_id}</audience>" in gateway_policy
assert "api://${var.gateway_client_id}" not in gateway_policy
assert "backend_identity_client_id = module.identity.managed_identity_client_id" in environment

assert 'resource "azuread_application_federated_identity_credential"' in workload
assert 'method         = "oidc-federation"' in workload
assert "federated_identity" in environment
assert "each.value.federated_identity" in environment
assert "azurerm_api_management_subscription" not in workload
assert "token_scope" in workload

print("identity contract assertions passed")