variable "name" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "private_endpoint_subnet_id" { type = string }
variable "private_dns_zone_id" { type = string }
variable "tags" { type = map(string) }
variable "consistency_level" {
  type    = string
  default = "Session"
  validation {
    condition     = contains(["BoundedStaleness", "Eventual", "Session", "Strong", "ConsistentPrefix"], var.consistency_level)
    error_message = "consistency_level must be one of: BoundedStaleness, Eventual, Session, Strong, ConsistentPrefix."
  }
}
variable "serverless_enabled" {
  type        = bool
  description = "Use consumption-based serverless throughput instead of provisioned RU/s."
  default     = true
}
variable "vector_search_enabled" {
  type        = bool
  description = "Enable the account-level EnableNoSQLVectorSearch capability for future retrieval/embedding workloads."
  default     = false
}
variable "session_ttl_seconds" {
  type        = number
  description = "Default TTL applied to items in the sessions container. -1 keeps items forever unless an item sets its own ttl."
  default     = 86400
}

locals {
  capabilities = concat(
    var.serverless_enabled ? ["EnableServerless"] : [],
    var.vector_search_enabled ? ["EnableNoSQLVectorSearch"] : []
  )
}

resource "azurerm_cosmosdb_account" "this" {
  name                          = "${var.name}-cosmos"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  offer_type                    = "Standard"
  kind                          = "GlobalDocumentDB"
  public_network_access_enabled = false
  local_authentication_enabled  = false
  minimal_tls_version           = "Tls12"

  consistency_policy {
    consistency_level = var.consistency_level
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }

  dynamic "capabilities" {
    for_each = toset(local.capabilities)
    content {
      name = capabilities.value
    }
  }

  tags = var.tags
}

resource "azurerm_cosmosdb_sql_database" "platform" {
  name                = "platform"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.this.name
}

resource "azurerm_cosmosdb_sql_container" "sessions" {
  name                  = "sessions"
  resource_group_name   = var.resource_group_name
  account_name          = azurerm_cosmosdb_account.this.name
  database_name         = azurerm_cosmosdb_sql_database.platform.name
  partition_key_paths   = ["/workloadId"]
  partition_key_version = 2
  default_ttl           = var.session_ttl_seconds
}

resource "azurerm_private_endpoint" "this" {
  name                = "${var.name}-cosmos-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id
  tags                = var.tags
  private_service_connection {
    name                           = "${var.name}-cosmos-psc"
    private_connection_resource_id = azurerm_cosmosdb_account.this.id
    subresource_names              = ["Sql"]
    is_manual_connection           = false
  }
  private_dns_zone_group {
    name                 = "cosmos"
    private_dns_zone_ids = [var.private_dns_zone_id]
  }
}

output "id" { value = azurerm_cosmosdb_account.this.id }
output "name" { value = azurerm_cosmosdb_account.this.name }
output "endpoint" { value = azurerm_cosmosdb_account.this.endpoint }
output "sql_database_name" { value = azurerm_cosmosdb_sql_database.platform.name }
output "sessions_container_name" { value = azurerm_cosmosdb_sql_container.sessions.name }
