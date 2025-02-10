# Redis Cache Module Variables
# Version: 1.0.0
# This module configures Azure Redis Cache instances with high availability 
# and performance settings for the AI-enhanced Excel Add-in

variable "resource_group_name" {
  description = "Name of the Azure resource group where Redis Cache will be deployed"
  type        = string
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9-_]{3,63}$", var.resource_group_name))
    error_message = "Resource group name must be 3-63 characters, alphanumeric with hyphens and underscores"
  }
}

variable "location" {
  description = "Azure region where Redis Cache will be deployed"
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

variable "redis_name_prefix" {
  description = "Prefix for Redis Cache instance name"
  type        = string
  default     = "redis"
  
  validation {
    condition     = can(regex("^[a-z0-9]{1,16}$", var.redis_name_prefix))
    error_message = "Redis name prefix must be 1-16 characters, lowercase alphanumeric"
  }
}

variable "redis_config" {
  description = "Configuration settings for Redis Cache instance"
  type = object({
    sku                   = string
    family               = string
    capacity             = number
    enable_non_ssl_port  = bool
    minimum_tls_version  = string
    redis_version        = string
    enable_geo_replication = bool
  })
  
  default = {
    sku                   = "Premium"
    family               = "P"
    capacity             = 1
    enable_non_ssl_port  = false
    minimum_tls_version  = "1.2"
    redis_version        = "6.2"
    enable_geo_replication = true
  }

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.redis_config.sku)
    error_message = "SKU must be one of: Basic, Standard, Premium"
  }

  validation {
    condition     = contains(["C", "P"], var.redis_config.family)
    error_message = "Family must be one of: C (Standard/Basic), P (Premium)"
  }

  validation {
    condition     = var.redis_config.capacity >= 0 && var.redis_config.capacity <= 6
    error_message = "Capacity must be between 0 and 6"
  }

  validation {
    condition     = contains(["1.0", "1.1", "1.2"], var.redis_config.minimum_tls_version)
    error_message = "Minimum TLS version must be one of: 1.0, 1.1, 1.2"
  }

  validation {
    condition     = var.redis_config.redis_version == "6.2"
    error_message = "Redis version must be 6.2"
  }
}

variable "tags" {
  description = "Resource tags for Redis Cache instance"
  type        = map(string)
  default = {
    service    = "redis-cache"
    managed_by = "terraform"
  }
}