# Azure Redis Cache Module
# Version: 1.0.0
# This module provisions and configures Azure Redis Cache instances with premium tier features,
# enhanced security, and performance optimizations for the AI-enhanced Excel Add-in

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Generate unique suffix for Redis Cache instance name
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Azure Redis Cache instance with premium tier configuration
resource "azurerm_redis_cache" "cache" {
  name                          = "${var.redis_name_prefix}-${var.environment}-${random_string.suffix.result}"
  resource_group_name           = var.resource_group_name
  location                      = var.location
  sku_name                     = var.redis_config.sku
  family                       = var.redis_config.family
  capacity                     = var.redis_config.capacity
  enable_non_ssl_port          = var.redis_config.enable_non_ssl_port
  minimum_tls_version          = var.redis_config.minimum_tls_version
  redis_version                = var.redis_config.redis_version
  public_network_access_enabled = false

  # Redis configuration for optimal performance and memory management
  redis_configuration {
    maxmemory_reserved              = "50"
    maxmemory_delta                 = "50"
    maxmemory_policy                = "allkeys-lru"
    maxfragmentationmemory_reserved = "50"
  }

  # Premium tier specific settings
  dynamic "patch_schedule" {
    for_each = var.redis_config.sku == "Premium" ? [1] : []
    content {
      day_of_week    = "Sunday"
      start_hour_utc = 2
    }
  }

  # Enable zone redundancy for Premium tier
  dynamic "zones" {
    for_each = var.redis_config.sku == "Premium" ? ["1", "2", "3"] : []
    content {
      zone = zones.value
    }
  }

  # Enable geo-replication for Premium tier
  dynamic "geo_replication" {
    for_each = var.redis_config.sku == "Premium" && var.redis_config.enable_geo_replication ? [1] : []
    content {
      location = var.location
    }
  }

  # Private endpoint configuration
  private_endpoint {
    name                = "${var.redis_name_prefix}-${var.environment}-endpoint"
    subnet_id           = var.subnet_id
    private_dns_zone_id = var.private_dns_zone_id
  }

  # Advanced threat protection
  threat_protection {
    enabled = true
    email_account_admins = true
    email_addresses      = var.alert_email_addresses
  }

  # Resource tags
  tags = merge(var.tags, {
    environment = var.environment
    created_by  = "terraform"
    cache_tier  = var.redis_config.sku
  })

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      tags["created_date"],
      redis_configuration["maxmemory_policy"]
    ]
  }
}

# Outputs for Redis Cache instance details
output "redis_name" {
  description = "The name of the Redis Cache instance"
  value       = azurerm_redis_cache.cache.name
}

output "redis_hostname" {
  description = "The hostname of the Redis Cache instance"
  value       = azurerm_redis_cache.cache.hostname
  sensitive   = true
}

output "redis_ssl_port" {
  description = "The SSL port of the Redis Cache instance"
  value       = azurerm_redis_cache.cache.ssl_port
}

output "redis_connection_string" {
  description = "The primary connection string of the Redis Cache instance"
  value       = azurerm_redis_cache.cache.primary_connection_string
  sensitive   = true
}