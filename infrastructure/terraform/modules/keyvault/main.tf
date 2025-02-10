# Azure Key Vault Module
# Version: 1.0.0
# Provider: hashicorp/azurerm ~> 3.0

# Get current Azure client configuration
data "azurerm_client_config" "current" {}

# Azure Key Vault resource with enhanced security controls
resource "azurerm_key_vault" "main" {
  name                = "${var.project}-${var.environment}-kv"
  location            = var.location
  resource_group_name = var.resource_group_name
  tenant_id          = data.azurerm_client_config.current.tenant_id
  sku_name           = "premium"

  # Enhanced security features
  enabled_for_disk_encryption = true
  soft_delete_retention_days = 90
  purge_protection_enabled   = true
  enable_rbac_authorization = true

  # Network security configuration
  network_acls {
    default_action             = "Deny"
    bypass                     = "AzureServices"
    ip_rules                  = var.network_acls.ip_rules
    virtual_network_subnet_ids = var.network_acls.virtual_network_subnet_ids
  }

  # Access policies for key vault operations
  dynamic "access_policy" {
    for_each = var.access_policies
    content {
      tenant_id               = access_policy.value.tenant_id
      object_id               = access_policy.value.object_id
      application_id          = access_policy.value.application_id
      certificate_permissions = access_policy.value.certificate_permissions
      key_permissions         = access_policy.value.key_permissions
      secret_permissions      = access_policy.value.secret_permissions
      storage_permissions     = access_policy.value.storage_permissions
    }
  }

  # Contact information for security notifications
  contact {
    email = "security@company.com"
    name  = "Security Team"
    phone = "1234567890"
  }

  # Resource tags
  tags = merge(
    var.tags,
    {
      environment = var.environment
      managed_by  = "terraform"
    }
  )

  # Lifecycle management
  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      contact,
      tags["created_date"]
    ]
  }
}

# Diagnostic settings for audit logging
resource "azurerm_monitor_diagnostic_setting" "main" {
  name                       = "${var.project}-${var.environment}-kv-diag"
  target_resource_id        = azurerm_key_vault.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  log {
    category = "AuditEvent"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 365
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 90
    }
  }
}

# Output values for integration
output "key_vault_id" {
  description = "The ID of the Key Vault"
  value       = azurerm_key_vault.main.id
}

output "key_vault_name" {
  description = "The name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "The URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

# Validation checks
locals {
  # Validate name length constraints
  validate_name_length = length("${var.project}-${var.environment}") <= 21 ? true : file("ERROR: Combined project and environment names must be 21 characters or less")

  # Validate network security configuration
  validate_network_rules = length(var.network_acls.virtual_network_subnet_ids) > 0 || length(var.network_acls.ip_rules) > 0 ? true : file("ERROR: At least one subnet or IP range must be allowed")

  # Validate access policies configuration
  validate_access_policies = length(var.access_policies) > 0 ? true : file("ERROR: At least one access policy must be defined")
}