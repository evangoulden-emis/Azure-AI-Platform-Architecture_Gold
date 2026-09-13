variable "workload_id" { type = string }
variable "owner" { type = string }
variable "classification" { type = string }
variable "model_routes" { type = list(string) }
variable "retrieval_indexes" { type = list(string) }
variable "quota_per_minute" { type = number }
variable "api_management_name" { type = string }
variable "resource_group_name" { type = string }
variable "api_name" { type = string }
variable "workload_client_id" { type = string }
variable "gateway_client_id" { type = string }
variable "gateway_scope" { type = string }
variable "tenant_id" { type = string }

resource "azurerm_api_management_product" "this" {
  product_id            = "workload-${var.workload_id}"
  api_management_name   = var.api_management_name
  resource_group_name   = var.resource_group_name
  display_name          = "AI workload ${var.workload_id}"
  description           = "Owner: ${var.owner}; classification: ${var.classification}"
  subscription_required = false
  approval_required     = false
  published             = true
}

resource "azurerm_api_management_product_api" "this" {
  api_name            = var.api_name
  product_id          = azurerm_api_management_product.this.product_id
  api_management_name = var.api_management_name
  resource_group_name = var.resource_group_name
}

output "onboarding" {
  value = {
    product_id         = azurerm_api_management_product.this.product_id
    workload_client_id = var.workload_client_id
    authentication = {
      method         = "existing-entra-registration"
      tenant_id      = var.tenant_id
      token_scope    = var.gateway_scope
      token_audience = var.gateway_client_id
    }
    owner             = var.owner
    classification    = var.classification
    model_routes      = var.model_routes
    retrieval_indexes = var.retrieval_indexes
    quota_per_minute  = var.quota_per_minute
  }
}

output "policy_registration" {
  value = {
    client_id         = var.workload_client_id
    classification    = var.classification
    model_routes      = var.model_routes
    retrieval_indexes = var.retrieval_indexes
    quota_per_minute  = var.quota_per_minute
  }
}