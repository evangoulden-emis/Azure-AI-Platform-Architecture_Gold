variable "name" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "address_space" { type = list(string) }
variable "tags" { type = map(string) }

resource "azurerm_virtual_network" "this" {
  name                = "${var.name}-vnet"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = var.address_space
  tags                = var.tags
}

resource "azurerm_subnet" "apim" {
  name                 = "snet-apim"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = [cidrsubnet(var.address_space[0], 4, 0)]
}

resource "azurerm_subnet" "private_endpoints" {
  name                              = "snet-private-endpoints"
  resource_group_name               = var.resource_group_name
  virtual_network_name              = azurerm_virtual_network.this.name
  address_prefixes                  = [cidrsubnet(var.address_space[0], 4, 1)]
  private_endpoint_network_policies = "Disabled"
}

locals {
  zones = toset([
    "privatelink.api.azureml.ms",
    "privatelink.blob.core.windows.net",
    "privatelink.cognitiveservices.azure.com",
    "privatelink.documents.azure.com",
    "privatelink.file.core.windows.net",
    "privatelink.notebooks.azure.net",
    "privatelink.redis.cache.windows.net",
    "privatelink.search.windows.net",
    "privatelink.vaultcore.azure.net"
  ])
}

resource "azurerm_private_dns_zone" "this" {
  for_each            = local.zones
  name                = each.value
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "this" {
  for_each              = local.zones
  name                  = replace("${var.name}-${each.value}", ".", "-")
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.this[each.value].name
  virtual_network_id    = azurerm_virtual_network.this.id
}

output "vnet_id" { value = azurerm_virtual_network.this.id }
output "apim_subnet_id" { value = azurerm_subnet.apim.id }
output "private_endpoint_subnet_id" { value = azurerm_subnet.private_endpoints.id }
output "private_dns_zone_ids" { value = { for k, v in azurerm_private_dns_zone.this : k => v.id } }