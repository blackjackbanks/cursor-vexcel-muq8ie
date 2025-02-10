# Core project configuration variables
variable "project_name" {
  description = "Name of the AI-enhanced Excel Add-in project"
  type        = string
  default     = "ai-excel-addin"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,24}$", var.project_name))
    error_message = "Project name must be 3-24 characters, lowercase alphanumeric with hyphens"
  }
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "location" {
  description = "Primary Azure region for resource deployment"
  type        = string
  default     = "eastus"

  validation {
    condition     = contains(["eastus", "westeurope", "eastasia"], var.location)
    error_message = "Location must be one of: eastus, westeurope, eastasia"
  }
}

variable "secondary_location" {
  description = "Secondary Azure region for failover and redundancy"
  type        = string
  default     = "westeurope"

  validation {
    condition     = var.secondary_location != var.location
    error_message = "Secondary location must be different from primary location"
  }
}

variable "resource_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    application = "ai-excel-addin"
    managed_by  = "terraform"
    environment = "var.environment"
  }
}

variable "aks_config" {
  description = "AKS cluster configuration"
  type = object({
    kubernetes_version  = string
    node_count         = number
    vm_size            = string
    enable_auto_scaling = bool
    min_node_count     = number
    max_node_count     = number
  })
  default = {
    kubernetes_version  = "1.25"
    node_count         = 3
    vm_size           = "Standard_DS2_v2"
    enable_auto_scaling = true
    min_node_count     = 3
    max_node_count     = 6
  }
}

variable "sql_config" {
  description = "Azure SQL Database configuration"
  type = object({
    edition              = string
    family              = string
    capacity            = number
    size_gb             = number
    backup_retention_days = number
  })
  default = {
    edition              = "GeneralPurpose"
    family              = "Gen5"
    capacity            = 4
    size_gb             = 32
    backup_retention_days = 7
  }
}

variable "redis_config" {
  description = "Azure Redis Cache configuration"
  type = object({
    sku                  = string
    family              = string
    capacity            = number
    enable_non_ssl_port = bool
    enable_geo_replication = bool
  })
  default = {
    sku                  = "Premium"
    family              = "P"
    capacity            = 1
    enable_non_ssl_port = false
    enable_geo_replication = true
  }
}

variable "monitoring_config" {
  description = "Azure Monitor and Log Analytics configuration"
  type = object({
    retention_days            = number
    enable_container_insights = bool
    enable_application_insights = bool
  })
  default = {
    retention_days            = 30
    enable_container_insights = true
    enable_application_insights = true
  }
}