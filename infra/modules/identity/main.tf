variable "name" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "tags" { type = map(string) }

resource "azuread_application" "gateway" {
  display_name     = "${var.name}-gateway"
  sign_in_audience = "AzureADMyOrg"
  identifier_uris  = ["api://${var.name}-gateway"]

  api {
    requested_access_token_version = 2
    oauth2_permission_scope {
      admin_consent_description  = "Call the governed Northstar AI gateway"
      admin_consent_display_name = "Call AI gateway"
      enabled                    = true
      id                         = uuidv5("dns", "${var.name}.gateway.access")
      type                       = "Admin"
      user_consent_description   = "Call the governed Northstar AI gateway"
      user_consent_display_name  = "Call AI gateway"
      value                      = "gateway.invoke"
    }
  }

  app_role {
    allowed_member_types = ["Application"]
    description          = "Allows an approved workload identity to invoke the AI gateway"
    display_name         = "Invoke AI gateway"
    enabled              = true
    id                   = uuidv5("dns", "${var.name}.gateway.application.invoke")
    value                = "gateway.invoke"
  }
}

resource "azuread_service_principal" "gateway" {
  client_id                    = azuread_application.gateway.client_id
  app_role_assignment_required = true
}

resource "azurerm_user_assigned_identity" "platform" {
  name                = "${var.name}-platform-mi"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

output "gateway_client_id" { value = azuread_application.gateway.client_id }
output "gateway_scope" { value = "api://${var.name}-gateway/.default" }
output "gateway_app_role_id" { value = one(azuread_application.gateway.app_role).id }
output "gateway_service_principal_id" { value = azuread_service_principal.gateway.object_id }
output "managed_identity_id" { value = azurerm_user_assigned_identity.platform.id }
output "managed_identity_client_id" { value = azurerm_user_assigned_identity.platform.client_id }
output "managed_identity_principal_id" { value = azurerm_user_assigned_identity.platform.principal_id }