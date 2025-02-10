# Resource Group Configuration
variable "resource_group_name" {
  description = "Name of the resource group where SQL resources will be created"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z0-9-_]{3,63}$", var.resource_group_name))
    error_message = "Resource group name must be 3-63 characters, alphanumeric with hyphens and underscores"
  }
}

# Location Configuration
variable "location" {
  description = "Primary Azure region where SQL resources will be deployed"
  type        = string
  validation {
    condition     = contains(["eastus", "westeurope", "eastasia"], var.location)
    error_message = "Location must be one of: eastus, westeurope, eastasia"
  }
}

variable "secondary_location" {
  description = "Secondary Azure region for geo-replication and failover"
  type        = string
  validation {
    condition     = var.secondary_location != var.location && contains(["eastus", "westeurope", "eastasia"], var.secondary_location)
    error_message = "Secondary location must be different from primary location and one of: eastus, westeurope, eastasia"
  }
}

# Environment Configuration
variable "environment" {
  description = "Deployment environment identifier"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# SQL Server Configuration
variable "server_name_prefix" {
  description = "Prefix for the SQL server name"
  type        = string
  default     = "sql"
  validation {
    condition     = can(regex("^[a-z0-9]{1,10}$", var.server_name_prefix))
    error_message = "Server name prefix must be 1-10 characters, lowercase alphanumeric"
  }
}

variable "database_name" {
  description = "Name of the SQL database"
  type        = string
  default     = "aiexceladdin"
  validation {
    condition     = can(regex("^[a-z0-9-]{3,63}$", var.database_name))
    error_message = "Database name must be 3-63 characters, lowercase alphanumeric with hyphens"
  }
}

# Authentication Configuration
variable "administrator_login" {
  description = "SQL server administrator login name"
  type        = string
  sensitive   = true
  validation {
    condition     = can(regex("^[a-zA-Z0-9-_]{3,128}$", var.administrator_login))
    error_message = "Administrator login must be 3-128 characters, alphanumeric with hyphens and underscores"
  }
}

variable "administrator_password" {
  description = "SQL server administrator password"
  type        = string
  sensitive   = true
  validation {
    condition     = can(regex("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,128}$", var.administrator_password))
    error_message = "Password must be 12-128 characters with at least one uppercase, lowercase, number, and special character"
  }
}

# Performance Configuration
variable "sku_name" {
  description = "SKU name for the SQL database"
  type        = string
  default     = "GP_Gen5_4"
  validation {
    condition     = contains(["GP_Gen5_4", "GP_Gen5_8", "BC_Gen5_4", "BC_Gen5_8"], var.sku_name)
    error_message = "SKU name must be one of: GP_Gen5_4, GP_Gen5_8, BC_Gen5_4, BC_Gen5_8"
  }
}

# Security Configuration
variable "minimum_tls_version" {
  description = "Minimum TLS version for SQL server"
  type        = string
  default     = "1.2"
  validation {
    condition     = contains(["1.2"], var.minimum_tls_version)
    error_message = "TLS version must be 1.2 for security compliance"
  }
}

# Resource Tagging
variable "tags" {
  description = "Tags to apply to SQL resources"
  type        = map(string)
  default = {
    module      = "sql"
    managed_by  = "terraform"
    environment = "var.environment"
  }
}

# Network Security Configuration
variable "firewall_rules" {
  description = "Map of firewall rules to apply to SQL server"
  type = map(object({
    start_ip = string
    end_ip   = string
  }))
  default = {}
  validation {
    condition     = alltrue([for rule in var.firewall_rules : can(regex("^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$", rule.start_ip)) && can(regex("^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$", rule.end_ip))])
    error_message = "Firewall rule IP addresses must be valid IPv4 addresses"
  }
}