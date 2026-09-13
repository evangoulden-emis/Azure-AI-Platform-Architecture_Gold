output "platform" {
  value = {
    environment                         = var.environment
    location                            = var.location
    resource_group_id                   = azurerm_resource_group.platform.id
    gateway_url                         = module.apim.gateway_url
    gateway_client_id                   = var.gateway_client_id
    platform_managed_identity_id        = var.platform_identity_resource_id
    platform_managed_identity_client_id = var.platform_identity_client_id
    key_vault_id                        = module.vault.id
    foundry_account_id                  = module.foundry.id
    foundry_project_id                  = module.foundry.project_id
    retrieval_search_endpoint           = module.retrieval.search_endpoint
    log_analytics_workspace_id          = module.observability.workspace_id
    private_dns_zone_ids                = module.network.private_dns_zone_ids
  }
}
output "workload_onboarding" {
  value = { for key, workload in module.workloads : key => workload.onboarding }
}