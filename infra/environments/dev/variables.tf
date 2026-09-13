variable "subscription_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9a-fA-F-]{36}$", var.subscription_id))
    error_message = "subscription_id must be an explicit Azure subscription UUID."
  }
}
variable "tenant_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9a-fA-F-]{36}$", var.tenant_id))
    error_message = "tenant_id must be an explicit Entra tenant UUID."
  }
}
variable "approved_nonprod_subscription_ids" {
  type = set(string)
  validation {
    condition     = length(var.approved_nonprod_subscription_ids) > 0
    error_message = "At least one centrally approved non-production subscription ID is required."
  }
}
variable "environment" {
  type    = string
  default = "dev"
  validation {
    condition     = var.environment == "dev"
    error_message = "This composition is development-only."
  }
}
variable "location" {
  type    = string
  default = "uksouth"
  validation {
    condition     = contains(["uksouth", "ukwest", "westeurope", "northeurope"], var.location)
    error_message = "location must be an approved UK/EU region."
  }
}
variable "address_space" {
  type    = list(string)
  default = ["10.40.0.0/20"]
}
variable "publisher_name" { type = string }
variable "publisher_email" { type = string }
variable "aidr_inspection_url" {
  type = string
  validation {
    condition     = startswith(var.aidr_inspection_url, "https://")
    error_message = "AIDR inspection must use HTTPS."
  }
}
variable "log_retention_days" {
  type    = number
  default = 90
  validation {
    condition     = var.log_retention_days >= 30 && var.log_retention_days <= 730
    error_message = "Log retention must be between 30 and 730 days."
  }
}
variable "model_route_deployments" {
  type = map(string)
  validation {
    condition = alltrue([
      for route, deployment in var.model_route_deployments :
      length(route) > 0 && length(deployment) > 0
    ])
    error_message = "Logical model routes must map to non-empty approved Foundry deployment names."
  }
}
variable "workloads" {
  type = map(object({
    owner             = string
    classification    = string
    model_routes      = list(string)
    retrieval_indexes = list(string)
    quota_per_minute  = number
    federated_identity = object({
      issuer    = string
      subject   = string
      audiences = set(string)
    })
  }))
  default = {}
  validation {
    condition = alltrue([
      for w in values(var.workloads) :
      contains(["public", "internal", "confidential"], w.classification) &&
      length(w.model_routes) > 0 &&
      w.quota_per_minute > 0 &&
      startswith(w.federated_identity.issuer, "https://") &&
      length(w.federated_identity.subject) > 0 &&
      length(w.federated_identity.audiences) > 0
    ])
    error_message = "Each workload needs an approved classification, model route, positive quota, and complete HTTPS OIDC federation contract."
  }
}
variable "tags" {
  type    = map(string)
  default = {}
}