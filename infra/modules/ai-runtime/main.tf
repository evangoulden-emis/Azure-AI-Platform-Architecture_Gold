variable "name" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "identity_id" { type = string }
variable "key_vault_id" { type = string }
variable "storage_account_id" { type = string }
variable "private_endpoint_subnet_id" { type = string }
variable "private_dns_zone_id" { type = string }
variable "foundry_api_private_dns_zone_id" { type = string }
variable "foundry_notebooks_private_dns_zone_id" { type = string }
variable "tags" { type = map(string) }
variable "sku_name" {
  type    = string
  default = "S0"
  validation {
    condition     = contains(["F0", "S0"], var.sku_name)
    error_message = "sku_name must be one of: F0, S0."
  }
}

resource "azurerm_cognitive_account" "foundry" {
  name                          = "${var.name}-foundry"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  kind                          = "AIServices"
  sku_name                      = var.sku_name
  custom_subdomain_name         = "${var.name}-foundry"
  local_auth_enabled            = false
  public_network_access_enabled = false
  identity {
    type         = "UserAssigned"
    identity_ids = [var.identity_id]
  }
  tags = merge(var.tags, { boundary = "azure-ai-foundry" })
}

resource "azurerm_ai_foundry" "this" {
  name                           = "${var.name}-hub"
  location                       = var.location
  resource_group_name            = var.resource_group_name
  key_vault_id                   = var.key_vault_id
  storage_account_id             = var.storage_account_id
  public_network_access          = "Disabled"
  primary_user_assigned_identity = var.identity_id
  identity {
    type         = "UserAssigned"
    identity_ids = [var.identity_id]
  }
  managed_network {
    isolation_mode = "AllowOnlyApprovedOutbound"
  }
  tags = merge(var.tags, { boundary = "azure-ai-foundry-hub" })
}

resource "azurerm_ai_foundry_project" "this" {
  name                           = "${var.name}-project"
  location                       = var.location
  ai_services_hub_id             = azurerm_ai_foundry.this.id
  primary_user_assigned_identity = var.identity_id
  identity {
    type         = "UserAssigned"
    identity_ids = [var.identity_id]
  }
  tags = merge(var.tags, { boundary = "azure-ai-foundry-project" })
}

resource "azurerm_private_endpoint" "hub" {
  name                = "${var.name}-foundry-hub-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id
  tags                = var.tags
  private_service_connection {
    name                           = "${var.name}-foundry-hub-psc"
    private_connection_resource_id = azurerm_ai_foundry.this.id
    subresource_names              = ["amlworkspace"]
    is_manual_connection           = false
  }
  private_dns_zone_group {
    name = "foundry-hub"
    private_dns_zone_ids = [
      var.foundry_api_private_dns_zone_id,
      var.foundry_notebooks_private_dns_zone_id
    ]
  }
}

resource "azurerm_private_endpoint" "foundry" {
  name                = "${var.name}-foundry-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id
  tags                = var.tags
  private_service_connection {
    name                           = "${var.name}-foundry-psc"
    private_connection_resource_id = azurerm_cognitive_account.foundry.id
    subresource_names              = ["account"]
    is_manual_connection           = false
  }
  private_dns_zone_group {
    name                 = "cognitive"
    private_dns_zone_ids = [var.private_dns_zone_id]
  }
}

output "id" { value = azurerm_ai_foundry.this.id }
output "project_id" { value = azurerm_ai_foundry_project.this.id }
output "ai_services_id" { value = azurerm_cognitive_account.foundry.id }
output "endpoint" { value = azurerm_cognitive_account.foundry.endpoint }