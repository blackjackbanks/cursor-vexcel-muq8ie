# Project and Environment Configuration
variable "project" {
  description = "Project name for the AI-enhanced Excel Add-in deployment"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{3,24}$", var.project))
    error_message = "Project name must be 3-24 characters, lowercase alphanumeric with hyphens only"
  }
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod) with specific security configurations"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "location" {
  description = "Azure region for Key Vault deployment with geo-redundancy support"
  type        = string

  validation {
    condition     = contains(["eastus", "westeurope", "eastasia"], var.location)
    error_message = "Location must be one of: eastus, westeurope, eastasia"
  }
}

variable "resource_group_name" {
  description = "Name of the resource group for Key Vault deployment and resource organization"
  type        = string
}

# Key Vault Configuration
variable "sku_name" {
  description = "SKU name for Key Vault (premium recommended for enhanced security features)"
  type        = string
  default     = "premium"

  validation {
    condition     = contains(["standard", "premium"], var.sku_name)
    error_message = "SKU name must be either standard or premium"
  }
}

variable "enabled_for_disk_encryption" {
  description = "Enable Key Vault for Azure Disk Encryption (ADE) support"
  type        = bool
  default     = true
}

variable "soft_delete_retention_days" {
  description = "Retention period for soft-deleted vaults and vault objects (7-90 days)"
  type        = number
  default     = 30

  validation {
    condition     = var.soft_delete_retention_days >= 7 && var.soft_delete_retention_days <= 90
    error_message = "Soft delete retention days must be between 7 and 90"
  }
}

variable "purge_protection_enabled" {
  description = "Enable purge protection to prevent data loss through permanent deletion"
  type        = bool
  default     = true
}

# Network Security Configuration
variable "network_acls" {
  description = "Network security rules for Key Vault access control"
  type = object({
    default_action             = string
    bypass                     = string
    ip_rules                   = list(string)
    virtual_network_subnet_ids = list(string)
  })
  default = {
    default_action             = "Deny"
    bypass                     = "AzureServices"
    ip_rules                   = []
    virtual_network_subnet_ids = []
  }
}

# Access Policies Configuration
variable "access_policies" {
  description = "List of access policies defining permissions for vault operations"
  type = list(object({
    object_id               = string
    tenant_id              = string
    application_id         = string
    certificate_permissions = list(string)
    key_permissions        = list(string)
    secret_permissions     = list(string)
    storage_permissions    = list(string)
  }))
  default = []
}

# Resource Tagging
variable "tags" {
  description = "Resource tags for organization and cost tracking"
  type        = map(string)
  default     = {}
}

# Combined Validation Rules
locals {
  validate_name_length = regex("^.{0,21}$", "${var.project}-${var.environment}") // Ensures combined name fits Key Vault limits
  validate_premium_prod = var.environment == "prod" && var.sku_name != "premium" ? tobool("Production environment must use premium SKU") : true
  validate_network_prod = var.environment == "prod" && var.network_acls.default_action != "Deny" ? tobool("Production environment must have default deny network rules") : true
}