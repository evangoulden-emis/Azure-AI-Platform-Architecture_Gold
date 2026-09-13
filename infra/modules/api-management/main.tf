variable "name" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "publisher_name" { type = string }
variable "publisher_email" { type = string }
variable "subnet_id" { type = string }
variable "vnet_id" { type = string }
variable "identity_id" { type = string }
variable "tags" { type = map(string) }

resource "azurerm_api_management" "this" {
  name                          = "${var.name}-apim"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  publisher_name                = var.publisher_name
  publisher_email               = var.publisher_email
  sku_name                      = "Developer_1"
  virtual_network_type          = "Internal"
  public_network_access_enabled = false
  virtual_network_configuration { subnet_id = var.subnet_id }
  identity {
    type         = "UserAssigned"
    identity_ids = [var.identity_id]
  }
  protocols { http2_enabled = true }
  tags = var.tags
}

resource "azurerm_private_dns_zone" "gateway" {
  name                = "azure-api.net"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "gateway" {
  name                  = "${var.name}-apim-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.gateway.name
  virtual_network_id    = var.vnet_id
}

resource "azurerm_private_dns_a_record" "gateway" {
  name                = azurerm_api_management.this.name
  zone_name           = azurerm_private_dns_zone.gateway.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  records             = azurerm_api_management.this.private_ip_addresses
  tags                = var.tags
}

output "id" { value = azurerm_api_management.this.id }
output "name" { value = azurerm_api_management.this.name }
output "gateway_url" { value = azurerm_api_management.this.gateway_url }