# Main Terraform configuration for AI-enhanced Excel Add-in infrastructure
# Implements multi-region deployment with primary, secondary, and DR regions

terraform {
  required_version = ">= 1.0.0"
  backend "azurerm" {
    # Backend configuration should be provided via backend.tfvars
  }
}

# Local variables for resource naming and regional configuration
locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  regions = {
    primary   = var.location
    secondary = var.secondary_location
    dr        = "eastasia"
  }
  
  # Common tags for all resources
  common_tags = merge(var.resource_tags, {
    managed_by = "terraform"
    created_at = timestamp()
  })
}

# Resource Groups for each region
resource "azurerm_resource_group" "regional" {
  for_each = local.regions
  
  name     = "${local.resource_prefix}-${each.key}-rg"
  location = each.value
  tags     = merge(local.common_tags, {
    region = each.key
    purpose = "Regional infrastructure"
  })
}

# Virtual Networks for each region
resource "azurerm_virtual_network" "regional" {
  for_each = local.regions
  
  name                = "${local.resource_prefix}-${each.key}-vnet"
  resource_group_name = azurerm_resource_group.regional[each.key].name
  location            = each.value
  address_space       = ["10.${index(keys(local.regions), each.key)}.0.0/16"]
  
  tags = merge(local.common_tags, {
    region = each.key
  })
}

# AKS Clusters for each region
resource "azurerm_kubernetes_cluster" "regional" {
  for_each = local.regions
  
  name                = "${local.resource_prefix}-${each.key}-aks"
  resource_group_name = azurerm_resource_group.regional[each.key].name
  location            = each.value
  dns_prefix          = "${local.resource_prefix}-${each.key}"
  kubernetes_version  = var.aks_config.kubernetes_version

  default_node_pool {
    name                = "default"
    node_count          = var.aks_config.node_count
    vm_size             = var.aks_config.vm_size
    enable_auto_scaling = var.aks_config.enable_auto_scaling
    min_count           = var.aks_config.min_node_count
    max_count           = var.aks_config.max_node_count
    vnet_subnet_id      = azurerm_subnet.aks[each.key].id
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
    network_policy    = "calico"
  }

  tags = merge(local.common_tags, {
    region = each.key
  })
}

# Azure SQL Databases for each region
resource "azurerm_mssql_server" "regional" {
  for_each = local.regions

  name                         = "${local.resource_prefix}-${each.key}-sql"
  resource_group_name          = azurerm_resource_group.regional[each.key].name
  location                     = each.value
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = random_password.sql_admin[each.key].result

  tags = merge(local.common_tags, {
    region = each.key
  })
}

resource "azurerm_mssql_database" "regional" {
  for_each = local.regions

  name                = "${local.resource_prefix}-db"
  server_id           = azurerm_mssql_server.regional[each.key].id
  sku_name            = var.sql_config.edition
  max_size_gb         = var.sql_config.size_gb

  tags = merge(local.common_tags, {
    region = each.key
  })
}

# Redis Cache instances for each region
resource "azurerm_redis_cache" "regional" {
  for_each = local.regions

  name                = "${local.resource_prefix}-${each.key}-redis"
  resource_group_name = azurerm_resource_group.regional[each.key].name
  location            = each.value
  capacity            = var.redis_config.capacity
  family              = var.redis_config.family
  sku_name            = var.redis_config.sku
  enable_non_ssl_port = var.redis_config.enable_non_ssl_port

  redis_configuration {
    enable_authentication = true
  }

  tags = merge(local.common_tags, {
    region = each.key
  })
}

# Traffic Manager for global load balancing
resource "azurerm_traffic_manager_profile" "global" {
  name                = "${local.resource_prefix}-tm"
  resource_group_name = azurerm_resource_group.regional["primary"].name
  
  traffic_routing_method = "Performance"
  
  dns_config {
    relative_name = local.resource_prefix
    ttl          = 60
  }
  
  monitor_config {
    protocol                     = "HTTPS"
    port                        = 443
    path                        = "/health"
    interval_in_seconds         = 30
    timeout_in_seconds         = 10
    tolerated_number_of_failures = 3
  }

  tags = local.common_tags
}

# Traffic Manager endpoints for each region
resource "azurerm_traffic_manager_endpoint" "regional" {
  for_each = local.regions

  name                = "${local.resource_prefix}-${each.key}-endpoint"
  resource_group_name = azurerm_resource_group.regional["primary"].name
  profile_name        = azurerm_traffic_manager_profile.global.name
  target_resource_id  = azurerm_kubernetes_cluster.regional[each.key].id
  type                = "AzureEndpoints"
  priority            = index(keys(local.regions), each.key) + 1

  custom_header {
    name  = "host"
    value = "${local.resource_prefix}-${each.key}.${var.domain}"
  }
}

# Log Analytics workspace for monitoring
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.resource_prefix}-law"
  resource_group_name = azurerm_resource_group.regional["primary"].name
  location            = local.regions["primary"]
  sku                 = "PerGB2018"
  retention_in_days   = var.monitoring_config.retention_days

  tags = local.common_tags
}

# Output the resource group IDs
output "resource_group_ids" {
  value = {
    for k, v in azurerm_resource_group.regional : k => v.id
  }
}

# Output the AKS cluster endpoints
output "aks_cluster_endpoints" {
  value = {
    for k, v in azurerm_kubernetes_cluster.regional : k => v.fqdn
  }
  sensitive = true
}

# Output the Traffic Manager DNS name
output "traffic_manager_fqdn" {
  value = azurerm_traffic_manager_profile.global.fqdn
}