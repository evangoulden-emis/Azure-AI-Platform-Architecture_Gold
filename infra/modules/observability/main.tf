variable "name" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "retention_days" { type = number }
variable "diagnostic_resource_ids" { type = map(string) }
variable "tags" { type = map(string) }

resource "azurerm_log_analytics_workspace" "this" {
  name                = "${var.name}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = var.retention_days
  tags                = var.tags
}

resource "azurerm_application_insights" "this" {
  name                = "${var.name}-appi"
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.this.id
  application_type    = "web"
  tags                = var.tags
}

resource "azurerm_monitor_diagnostic_setting" "this" {
  for_each                   = var.diagnostic_resource_ids
  name                       = "${var.name}-${each.key}-diagnostics"
  target_resource_id         = each.value
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  enabled_log { category_group = "allLogs" }
  enabled_metric { category = "AllMetrics" }
}

output "workspace_id" { value = azurerm_log_analytics_workspace.this.id }
output "application_insights_id" { value = azurerm_application_insights.this.id }
output "connection_string" {
  value     = azurerm_application_insights.this.connection_string
  sensitive = true
}