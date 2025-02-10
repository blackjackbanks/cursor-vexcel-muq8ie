# Azure Monitor Module Variables
# Defines configuration variables for monitoring infrastructure including Log Analytics workspace,
# Application Insights, and monitoring resources

variable "resource_group_name" {
  description = "Name of the resource group where monitoring resources will be deployed"
  type        = string
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9-_]{3,63}$", var.resource_group_name))
    error_message = "Resource group name must be 3-63 characters, alphanumeric with hyphens and underscores"
  }
}

variable "location" {
  description = "Azure region where monitoring resources will be deployed"
  type        = string
  
  validation {
    condition     = contains(["eastus", "westeurope", "eastasia"], var.location)
    error_message = "Location must be one of: eastus, westeurope, eastasia"
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

variable "workspace_sku" {
  description = "SKU for Log Analytics workspace"
  type        = string
  default     = "PerGB2018"
  
  validation {
    condition     = contains(["Free", "PerNode", "Premium", "Standard", "Standalone", "Unlimited", "PerGB2018"], var.workspace_sku)
    error_message = "Invalid Log Analytics workspace SKU"
  }
}

variable "log_retention_days" {
  description = "Number of days to retain logs in Log Analytics workspace"
  type        = number
  default     = 30
  
  validation {
    condition     = var.log_retention_days >= 30 && var.log_retention_days <= 730
    error_message = "Log retention days must be between 30 and 730"
  }
}

variable "application_insights_type" {
  description = "Type of Application Insights resource"
  type        = string
  default     = "web"
  
  validation {
    condition     = contains(["web", "other"], var.application_insights_type)
    error_message = "Application Insights type must be either 'web' or 'other'"
  }
}

variable "alert_notification_emails" {
  description = "List of email addresses to receive monitoring alerts"
  type        = list(string)
  
  validation {
    condition     = length(var.alert_notification_emails) > 0
    error_message = "At least one notification email must be provided"
  }
}

variable "performance_thresholds" {
  description = "Performance metric thresholds for alerts"
  type = object({
    response_time   = number
    cpu_percent     = number
    memory_percent  = number
  })
  
  default = {
    response_time  = 2000  # milliseconds
    cpu_percent    = 80    # percentage
    memory_percent = 85    # percentage
  }
  
  validation {
    condition     = var.performance_thresholds.response_time > 0 && var.performance_thresholds.cpu_percent > 0 && var.performance_thresholds.memory_percent > 0
    error_message = "All performance thresholds must be positive numbers"
  }
}