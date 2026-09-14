variable "api_management_name" { type = string }
variable "resource_group_name" { type = string }
variable "backend_url" { type = string }

resource "azurerm_api_management_api" "this" {
  name                  = "enlivio-ai-v1"
  resource_group_name   = var.resource_group_name
  api_management_name   = var.api_management_name
  revision              = "1"
  display_name          = "enlivio governed AI gateway"
  path                  = ""
  protocols             = ["https"]
  subscription_required = false
  service_url           = var.backend_url
}

resource "azurerm_api_management_api_operation" "responses" {
  operation_id        = "responses"
  api_name            = azurerm_api_management_api.this.name
  api_management_name = var.api_management_name
  resource_group_name = var.resource_group_name
  display_name        = "Governed AI response"
  method              = "POST"
  url_template        = "/v1/responses"
  response {
    status_code = 200
  }
}

output "api_id" { value = azurerm_api_management_api.this.id }
output "api_name" { value = azurerm_api_management_api.this.name }
