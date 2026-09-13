variable "name" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "private_endpoint_subnet_id" { type = string }
variable "blob_private_dns_zone_id" { type = string }
variable "search_private_dns_zone_id" { type = string }
variable "tags" { type = map(string) }

resource "azurerm_storage_account" "source" {
  name                            = substr(replace("${var.name}data", "-", ""), 0, 24)
  resource_group_name             = var.resource_group_name
  location                        = var.location
  account_tier                    = "Standard"
  account_replication_type        = "ZRS"
  account_kind                    = "StorageV2"
  is_hns_enabled                  = true
  min_tls_version                 = "TLS1_2"
  public_network_access_enabled   = false
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  tags                            = var.tags
}

resource "azurerm_search_service" "this" {
  name                          = "${var.name}-search"
  resource_group_name           = var.resource_group_name
  location                      = var.location
  sku                           = "basic"
  local_authentication_enabled  = false
  public_network_access_enabled = false
  semantic_search_sku           = "free"
  identity { type = "SystemAssigned" }
  tags = var.tags
}

resource "azurerm_private_endpoint" "blob" {
  name                = "${var.name}-blob-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id
  tags                = var.tags
  private_service_connection {
    name                           = "${var.name}-blob-psc"
    private_connection_resource_id = azurerm_storage_account.source.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }
  private_dns_zone_group {
    name                 = "blob"
    private_dns_zone_ids = [var.blob_private_dns_zone_id]
  }
}

resource "azurerm_private_endpoint" "search" {
  name                = "${var.name}-search-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id
  tags                = var.tags
  private_service_connection {
    name                           = "${var.name}-search-psc"
    private_connection_resource_id = azurerm_search_service.this.id
    subresource_names              = ["searchService"]
    is_manual_connection           = false
  }
  private_dns_zone_group {
    name                 = "search"
    private_dns_zone_ids = [var.search_private_dns_zone_id]
  }
}

output "storage_account_id" { value = azurerm_storage_account.source.id }
output "blob_service_id" { value = "${azurerm_storage_account.source.id}/blobServices/default" }
output "search_service_id" { value = azurerm_search_service.this.id }
output "search_endpoint" { value = "https://${azurerm_search_service.this.name}.search.windows.net" }