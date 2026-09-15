variable "subscription_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9a-fA-F-]{36}$", var.subscription_id))
    error_message = "subscription_id must be an explicit Azure subscription UUID."
  }
}
variable "tenant_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9a-fA-F-]{36}$", var.tenant_id))
    error_message = "tenant_id must be an explicit Entra tenant UUID."
  }
}
variable "gateway_client_id" {
  type        = string
  description = "Client ID of the existing Entra application that represents the APIM AI gateway."
  validation {
    condition     = can(regex("^[0-9a-fA-F-]{36}$", var.gateway_client_id))
    error_message = "gateway_client_id must be an existing Entra application client UUID."
  }
}
variable "gateway_scope" {
  type        = string
  description = "Existing Entra scope used by workloads when requesting a gateway token."
  validation {
    condition     = length(var.gateway_scope) > 0
    error_message = "gateway_scope must identify an existing Entra gateway scope."
  }
}
variable "platform_identity_resource_id" {
  type        = string
  description = "Azure resource ID of the existing user-assigned managed identity."
}
variable "platform_identity_client_id" {
  type        = string
  description = "Client ID of the existing user-assigned managed identity."
  validation {
    condition     = can(regex("^[0-9a-fA-F-]{36}$", var.platform_identity_client_id))
    error_message = "platform_identity_client_id must be an existing Entra client UUID."
  }
}
variable "platform_identity_principal_id" {
  type        = string
  description = "Principal/object ID of the existing user-assigned managed identity."
  validation {
    condition     = can(regex("^[0-9a-fA-F-]{36}$", var.platform_identity_principal_id))
    error_message = "platform_identity_principal_id must be an existing Entra principal UUID."
  }
}
variable "approved_prod_subscription_ids" {
  type = set(string)
  validation {
    condition     = length(var.approved_prod_subscription_ids) > 0
    error_message = "At least one centrally approved production subscription ID is required."
  }
}
variable "environment" {
  type    = string
  default = "dev"
  validation {
    condition     = var.environment == "prd"
    error_message = "This composition is production-only."
  }
}
variable "location" {
  type    = string
  default = "uksouth"
  validation {
    condition     = contains(["uksouth", "ukwest", "westeurope", "northeurope"], var.location)
    error_message = "location must be an approved UK/EU region."
  }
}
variable "address_space" {
  type    = list(string)
  default = ["10.40.0.0/20"]
}
variable "publisher_name" { type = string }
variable "publisher_email" { type = string }
variable "aidr_inspection_url" {
  type = string
  validation {
    condition     = startswith(var.aidr_inspection_url, "https://")
    error_message = "AIDR inspection must use HTTPS."
  }
}
variable "log_retention_days" {
  type    = number
  default = 90
  validation {
    condition     = var.log_retention_days >= 30 && var.log_retention_days <= 730
    error_message = "Log retention must be between 30 and 730 days."
  }
}
variable "model_route_deployments" {
  type = map(string)
  validation {
    condition = alltrue([
      for route, deployment in var.model_route_deployments :
      length(route) > 0 && length(deployment) > 0
    ])
    error_message = "Logical model routes must map to non-empty approved Foundry deployment names."
  }
}
variable "workloads" {
  type = map(object({
    client_id         = string
    owner             = string
    classification    = string
    model_routes      = list(string)
    retrieval_indexes = list(string)
    quota_per_minute  = number
  }))
  default = {}
  validation {
    condition = alltrue([
      for w in values(var.workloads) :
      can(regex("^[0-9a-fA-F-]{36}$", w.client_id)) &&
      contains(["public", "internal", "confidential"], w.classification) &&
      length(w.model_routes) > 0 &&
      w.quota_per_minute > 0
    ])
    error_message = "Each workload needs an existing Entra client UUID, approved classification, model route, and positive quota."
  }
}
variable "tags" {
  type    = map(string)
  default = {}
}
variable "key_vault_sku_name" {
  type        = string
  description = "SKU for the platform Key Vault. One of: standard, premium."
  default     = "standard"
}
variable "api_management_sku_name" {
  type        = string
  description = "SKU for the API Management gateway, in the form <Tier>_<Capacity>, e.g. Developer_1, Standard_2."
  default     = "Developer_1"
}
variable "log_analytics_sku" {
  type        = string
  description = "SKU for the Log Analytics workspace."
  default     = "PerGB2018"
}
variable "ai_foundry_sku_name" {
  type        = string
  description = "SKU for the Azure AI Foundry / Cognitive Services account. One of: F0, S0."
  default     = "S0"
}
variable "search_sku" {
  type        = string
  description = "SKU for the Azure AI Search service."
  default     = "basic"
}
variable "search_semantic_sku" {
  type        = string
  description = "Semantic search SKU for the Azure AI Search service. One of: free, standard, disabled."
  default     = "free"
}
variable "cosmos_consistency_level" {
  type        = string
  description = "Consistency level for the Cosmos DB session store."
  default     = "Session"
}
variable "cosmos_serverless_enabled" {
  type        = bool
  description = "Use consumption-based serverless throughput for the Cosmos DB session store instead of provisioned RU/s."
  default     = true
}
variable "cosmos_vector_search_enabled" {
  type        = bool
  description = "Enable the EnableNoSQLVectorSearch capability on the Cosmos DB account for future retrieval/embedding use cases."
  default     = false
}
variable "cosmos_session_ttl_seconds" {
  type        = number
  description = "Default TTL, in seconds, applied to items in the Cosmos DB sessions container."
  default     = 86400
}
variable "redis_sku_name" {
  type        = string
  description = "SKU for the Redis cache. One of: Basic, Standard, Premium."
  default     = "Standard"
}
variable "redis_family" {
  type        = string
  description = "SKU family for the Redis cache. C = Basic/Standard, P = Premium."
  default     = "C"
}
variable "redis_capacity" {
  type        = number
  description = "Redis cache size. 0-6 for family C, 1-4 for family P."
  default     = 1
}
variable "redis_active_directory_authentication_enabled" {
  type        = bool
  description = "Enable Entra ID data-plane authentication for Redis in place of access keys. Requires redis_family = \"P\" (Premium)."
  default     = false
}
