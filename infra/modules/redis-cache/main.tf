variable "name" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "private_endpoint_subnet_id" { type = string }
variable "private_dns_zone_id" { type = string }
variable "tags" { type = map(string) }
variable "sku_name" {
  type    = string
  default = "Standard"
  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.sku_name)
    error_message = "sku_name must be one of: Basic, Standard, Premium."
  }
}
variable "family" {
  type    = string
  default = "C"
  validation {
    condition     = contains(["C", "P"], var.family)
    error_message = "family must be C (Basic/Standard) or P (Premium)."
  }
}
variable "capacity" {
  type    = number
  default = 1
  validation {
    condition     = contains([0, 1, 2, 3, 4, 5, 6], var.capacity)
    error_message = "capacity must be between 0 and 6 (C family) or 1 and 4 (P family)."
  }
}
variable "active_directory_authentication_enabled" {
  type        = bool
  description = "Enable Entra ID data-plane authentication in place of access keys. Requires a Premium (family = \"P\") SKU."
  default     = false
}

resource "azurerm_redis_cache" "this" {
  name                               = "${var.name}-redis"
  location                           = var.location
  resource_group_name                = var.resource_group_name
  sku_name                           = var.sku_name
  family                             = var.family
  capacity                           = var.capacity
  non_ssl_port_enabled               = false
  minimum_tls_version                = "1.2"
  public_network_access_enabled      = false
  access_keys_authentication_enabled = !var.active_directory_authentication_enabled

  redis_configuration {
    active_directory_authentication_enabled = var.active_directory_authentication_enabled
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "this" {
  name                = "${var.name}-redis-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id
  tags                = var.tags
  private_service_connection {
    name                           = "${var.name}-redis-psc"
    private_connection_resource_id = azurerm_redis_cache.this.id
    subresource_names              = ["redisCache"]
    is_manual_connection           = false
  }
  private_dns_zone_group {
    name                 = "redis"
    private_dns_zone_ids = [var.private_dns_zone_id]
  }
}

output "id" { value = azurerm_redis_cache.this.id }
output "name" { value = azurerm_redis_cache.this.name }
output "hostname" { value = azurerm_redis_cache.this.hostname }
output "ssl_port" { value = azurerm_redis_cache.this.ssl_port }
