terraform {
  required_version = ">= 1.8.0"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "= 4.81.0" }
  }
}

provider "azurerm" {
  subscription_id = var.subscription_id
  features {}
}
data "azurerm_client_config" "current" {}
data "azurerm_subscription" "current" {
  subscription_id = var.subscription_id
}

locals {
  name = "enlivio-${var.environment}"
  tags = merge(var.tags, {
    application         = "enlivio-ai-platform"
    environment         = var.environment
    managed-by          = "terraform"
    data-classification = "production"
  })
}

resource "azurerm_resource_group" "platform" {
  name     = "rg-${local.name}-platform"
  location = var.location
  tags     = local.tags
  lifecycle {
    precondition {
      condition     = var.environment == "prd" && !can(regex("(?i)prod", var.environment))
      error_message = "Only the production environment is permitted by this composition."
    }
    precondition {
      condition     = data.azurerm_client_config.current.subscription_id == var.subscription_id
      error_message = "Authenticated Azure subscription does not match the explicitly approved production subscription_id."
    }
    precondition {
      condition     = contains(var.approved_prod_subscription_ids, var.subscription_id)
      error_message = "subscription_id is not present in the independently supplied production subscription allow-list."
    }
    precondition {
      condition = alltrue(flatten([
        for workload in values(var.workloads) : [
          for route in workload.model_routes : contains(keys(var.model_route_deployments), route)
        ]
      ]))
      error_message = "Every logical workload model route must map to an approved Foundry deployment."
    }
    precondition {
      condition = contains(
        ["dev", "development", "non-production"],
        lower(lookup(data.azurerm_subscription.current.tags, "environment", ""))
      )
      error_message = "The Azure subscription must carry an environment tag explicitly identifying it as development or non-production."
    }
  }
}

module "network" {
  source              = "../../modules/private-network"
  name                = local.name
  location            = var.location
  resource_group_name = azurerm_resource_group.platform.name
  address_space       = var.address_space
  tags                = local.tags
}
module "vault" {
  source                     = "../../modules/key-vault"
  name                       = local.name
  location                   = var.location
  resource_group_name        = azurerm_resource_group.platform.name
  tenant_id                  = var.tenant_id
  private_endpoint_subnet_id = module.network.private_endpoint_subnet_id
  private_dns_zone_id        = module.network.private_dns_zone_ids["privatelink.vaultcore.azure.net"]
  sku_name                   = var.key_vault_sku_name
  tags                       = local.tags
}
module "retrieval" {
  source                     = "../../modules/retrieval"
  name                       = local.name
  location                   = var.location
  resource_group_name        = azurerm_resource_group.platform.name
  private_endpoint_subnet_id = module.network.private_endpoint_subnet_id
  blob_private_dns_zone_id   = module.network.private_dns_zone_ids["privatelink.blob.core.windows.net"]
  search_private_dns_zone_id = module.network.private_dns_zone_ids["privatelink.search.windows.net"]
  search_sku                 = var.search_sku
  semantic_search_sku        = var.search_semantic_sku
  tags                       = local.tags
}
module "session_store" {
  source                     = "../../modules/cosmos-db"
  name                       = local.name
  location                   = var.location
  resource_group_name        = azurerm_resource_group.platform.name
  private_endpoint_subnet_id = module.network.private_endpoint_subnet_id
  private_dns_zone_id        = module.network.private_dns_zone_ids["privatelink.documents.azure.com"]
  consistency_level          = var.cosmos_consistency_level
  serverless_enabled         = var.cosmos_serverless_enabled
  vector_search_enabled      = var.cosmos_vector_search_enabled
  session_ttl_seconds        = var.cosmos_session_ttl_seconds
  tags                       = local.tags
}
module "cache" {
  source                                  = "../../modules/redis-cache"
  name                                    = local.name
  location                                = var.location
  resource_group_name                     = azurerm_resource_group.platform.name
  private_endpoint_subnet_id              = module.network.private_endpoint_subnet_id
  private_dns_zone_id                     = module.network.private_dns_zone_ids["privatelink.redis.cache.windows.net"]
  sku_name                                = var.redis_sku_name
  family                                  = var.redis_family
  capacity                                = var.redis_capacity
  active_directory_authentication_enabled = var.redis_active_directory_authentication_enabled
  tags                                    = local.tags
}
module "foundry" {
  source                                = "../../modules/ai-runtime"
  name                                  = local.name
  location                              = var.location
  resource_group_name                   = azurerm_resource_group.platform.name
  identity_id                           = var.platform_identity_resource_id
  key_vault_id                          = module.vault.id
  storage_account_id                    = module.retrieval.storage_account_id
  private_endpoint_subnet_id            = module.network.private_endpoint_subnet_id
  private_dns_zone_id                   = module.network.private_dns_zone_ids["privatelink.cognitiveservices.azure.com"]
  foundry_api_private_dns_zone_id       = module.network.private_dns_zone_ids["privatelink.api.azureml.ms"]
  foundry_notebooks_private_dns_zone_id = module.network.private_dns_zone_ids["privatelink.notebooks.azure.net"]
  sku_name                              = var.ai_foundry_sku_name
  tags                                  = local.tags
}
module "apim" {
  source              = "../../modules/api-management"
  name                = local.name
  location            = var.location
  resource_group_name = azurerm_resource_group.platform.name
  publisher_name      = var.publisher_name
  publisher_email     = var.publisher_email
  subnet_id           = module.network.apim_subnet_id
  vnet_id             = module.network.vnet_id
  identity_id         = var.platform_identity_resource_id
  sku_name            = var.api_management_sku_name
  tags                = local.tags
}
module "gateway" {
  source              = "../../modules/model-gateway"
  api_management_name = module.apim.name
  resource_group_name = azurerm_resource_group.platform.name
  backend_url         = module.foundry.endpoint
}

resource "azurerm_role_assignment" "gateway_model_inference" {
  scope                = module.foundry.ai_services_id
  role_definition_name = "Cognitive Services OpenAI User"
  principal_id         = var.platform_identity_principal_id
}

resource "azurerm_role_assignment" "platform_secrets" {
  scope                = module.vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.platform_identity_principal_id
}

resource "azurerm_role_assignment" "platform_blob_data" {
  scope                = module.retrieval.storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.platform_identity_principal_id
}

resource "azurerm_role_assignment" "platform_search_data" {
  scope                = module.retrieval.search_service_id
  role_definition_name = "Search Index Data Contributor"
  principal_id         = var.platform_identity_principal_id
}

resource "azurerm_role_assignment" "platform_search_service" {
  scope                = module.retrieval.search_service_id
  role_definition_name = "Search Service Contributor"
  principal_id         = var.platform_identity_principal_id
}

resource "azurerm_cosmosdb_sql_role_assignment" "platform_session_store" {
  resource_group_name = azurerm_resource_group.platform.name
  account_name        = module.session_store.name
  role_definition_id  = "${module.session_store.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = var.platform_identity_principal_id
  scope               = module.session_store.id
}

module "workloads" {
  for_each            = var.workloads
  source              = "../../modules/workload"
  workload_id         = each.key
  owner               = each.value.owner
  classification      = each.value.classification
  model_routes        = each.value.model_routes
  retrieval_indexes   = each.value.retrieval_indexes
  quota_per_minute    = each.value.quota_per_minute
  api_management_name = module.apim.name
  resource_group_name = azurerm_resource_group.platform.name
  api_name            = module.gateway.api_name
  workload_client_id  = each.value.client_id
  gateway_client_id   = var.gateway_client_id
  gateway_scope       = var.gateway_scope
  tenant_id           = var.tenant_id
}

module "gateway_policy" {
  source                     = "../../modules/gateway-policy"
  api_management_name        = module.apim.name
  resource_group_name        = azurerm_resource_group.platform.name
  api_name                   = module.gateway.api_name
  gateway_client_id          = var.gateway_client_id
  tenant_id                  = var.tenant_id
  backend_identity_client_id = var.platform_identity_client_id
  aidr_inspection_url        = var.aidr_inspection_url
  model_route_deployments    = var.model_route_deployments
  workloads = {
    for workload_id, workload in module.workloads :
    workload_id => workload.policy_registration
  }
}
module "observability" {
  source              = "../../modules/observability"
  name                = local.name
  location            = var.location
  resource_group_name = azurerm_resource_group.platform.name
  retention_days      = var.log_retention_days
  sku                 = var.log_analytics_sku
  diagnostic_resource_ids = {
    apim      = module.apim.id
    blob      = module.retrieval.blob_service_id
    cache     = module.cache.id
    cosmos    = module.session_store.id
    foundry   = module.foundry.id
    key_vault = module.vault.id
    search    = module.retrieval.search_service_id
  }
  tags = local.tags
}
