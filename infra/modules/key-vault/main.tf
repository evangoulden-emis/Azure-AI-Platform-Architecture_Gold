variable "name" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "tenant_id" { type = string }
variable "private_endpoint_subnet_id" { type = string }
variable "private_dns_zone_id" { type = string }
variable "tags" { type = map(string) }
variable "sku_name" {
  type    = string
  default = "standard"
  validation {
    condition     = contains(["standard", "premium"], var.sku_name)
    error_message = "sku_name must be one of: standard, premium."
  }
}

resource "azurerm_key_vault" "this" {
  name                          = substr(replace("${var.name}kv", "-", ""), 0, 24)
  location                      = var.location
  resource_group_name           = var.resource_group_name
  tenant_id                     = var.tenant_id
  sku_name                      = var.sku_name
  rbac_authorization_enabled    = true
  public_network_access_enabled = false
  purge_protection_enabled      = true
  soft_delete_retention_days    = 90
  tags                          = var.tags
}

resource "azurerm_private_endpoint" "this" {
  name                = "${var.name}-kv-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id
  tags                = var.tags
  private_service_connection {
    name                           = "${var.name}-kv-psc"
    private_connection_resource_id = azurerm_key_vault.this.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }
  private_dns_zone_group {
    name                 = "vault"
    private_dns_zone_ids = [var.private_dns_zone_id]
  }
}

output "id" { value = azurerm_key_vault.this.id }
output "uri" { value = azurerm_key_vault.this.vault_uri }