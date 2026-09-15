subscription_id                   = "d3ac24fb-de02-4f65-a78e-f41c7e7af373"
approved_nonprod_subscription_ids = ["d3ac24fb-de02-4f65-a78e-f41c7e7af373"]
tenant_id                         = "2be0609b-17cb-416e-87cc-969234db89b9"
gateway_client_id                 = "756ccbc4-3955-4688-9435-4faf0639b342"
gateway_scope                     = "api://756ccbc4-3955-4688-9435-4faf0639b342/apim_gateway_client_scope"
platform_identity_resource_id     = "/subscriptions/d3ac24fb-de02-4f65-a78e-f41c7e7af373/resourceGroups/dev-ai-rg-aiservices/providers/Microsoft.ManagedIdentity/userAssignedIdentities/foundry-managed-identity"
platform_identity_client_id       = "80f2d639-76c2-497d-a273-2136a0390772"
platform_identity_principal_id    = "f49041e1-f997-4a39-b97b-4577737c5608"
publisher_name                    = "enlivio AI Platform"
publisher_email                   = "platform-team@example.invalid"
aidr_inspection_url               = "https://aidr.nonprod.example.invalid/inspect"
model_route_deployments = {
  approved-chat-standard = "gpt-4o-mini-approved-001"
}

# Optional SKU overrides (defaults shown). Can also be set via TF_VAR_<name> environment variables.
# key_vault_sku_name      = "standard"
# api_management_sku_name = "Developer_1"
# log_analytics_sku       = "PerGB2018"
# ai_foundry_sku_name     = "S0"
# search_sku              = "basic"
# search_semantic_sku     = "free"

# workloads = {
#   pilot-search = {
#     client_id         = "00000000-0000-0000-0000-000000000000"
#     owner             = "pilot-team"
#     classification    = "internal"
#     model_routes      = ["approved-chat-standard"]
#     retrieval_indexes = ["pilot-documents"]
#     quota_per_minute  = 30
#   }
# }
