# Azure Kubernetes Service (AKS) Module
# Version: 1.0.0
# This module provisions an enterprise-grade AKS cluster with GPU-enabled node pools
# for AI workloads and advanced networking features for high availability

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

# Random suffix for unique naming
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Main AKS cluster resource
resource "azurerm_kubernetes_cluster" "main" {
  name                = "${var.resource_group_name}-aks-${random_string.suffix.result}"
  location            = var.location
  resource_group_name = var.resource_group_name
  kubernetes_version  = var.kubernetes_version
  dns_prefix         = "${var.resource_group_name}-aks"
  
  # System node pool configuration
  default_node_pool {
    name                = var.node_pool_config.system_pool.name
    vm_size             = var.node_pool_config.system_pool.vm_size
    node_count          = var.node_pool_config.system_pool.node_count
    enable_auto_scaling = var.node_pool_config.system_pool.enable_auto_scaling
    min_count          = var.node_pool_config.system_pool.min_count
    max_count          = var.node_pool_config.system_pool.max_count
    type               = "VirtualMachineScaleSets"
    zones              = [1, 2, 3]
    
    node_labels = {
      "pool-type"    = "system"
      "environment"  = var.tags["environment"]
      "managed-by"   = "terraform"
    }

    tags = var.tags
  }

  # Cluster identity configuration
  identity {
    type = "SystemAssigned"
  }

  # Advanced networking configuration
  network_profile {
    network_plugin     = var.network_config.network_plugin
    network_policy    = var.network_config.network_policy
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"
    service_cidr      = var.network_config.service_cidr
    dns_service_ip    = var.network_config.dns_service_ip
    docker_bridge_cidr = var.network_config.docker_bridge_cidr
  }

  # Monitoring and logging configuration
  monitor_metrics {
    enabled = var.monitoring_config.enable_metrics
  }

  oms_agent {
    log_analytics_workspace_id = var.monitoring_config.workspace_id
  }

  # Auto-scaler profile for optimal scaling behavior
  auto_scaler_profile {
    scale_down_delay_after_add       = "15m"
    scale_down_unneeded             = "15m"
    max_graceful_termination_sec    = "600"
    balance_similar_node_groups     = true
    expander                        = "random"
  }

  # Maintenance window configuration
  maintenance_window {
    allowed {
      day   = "Sunday"
      hours = [21, 22, 23]
    }
  }

  tags = var.tags
}

# GPU-enabled node pool for AI workloads
resource "azurerm_kubernetes_cluster_node_pool" "ai" {
  name                  = var.node_pool_config.ai_pool.name
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size              = var.node_pool_config.ai_pool.vm_size
  node_count           = var.node_pool_config.ai_pool.node_count
  enable_auto_scaling  = var.node_pool_config.ai_pool.enable_auto_scaling
  min_count           = var.node_pool_config.ai_pool.min_count
  max_count           = var.node_pool_config.ai_pool.max_count
  zones               = [1, 2, 3]

  # Node configuration for AI workloads
  node_labels = {
    "workload"    = "ai"
    "gpu"         = "enabled"
    "environment" = var.tags["environment"]
    "managed-by"  = "terraform"
  }

  node_taints = [
    "workload=ai:NoSchedule"
  ]

  # Advanced node pool settings
  max_pods           = 50
  os_disk_size_gb    = 128
  os_type            = "Linux"
  priority          = "Regular"
  eviction_policy    = null

  tags = var.tags
}

# Outputs for use in other modules
output "cluster_id" {
  description = "The ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.id
}

output "cluster_name" {
  description = "The name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.name
}

output "kube_config" {
  description = "Kubernetes configuration for cluster access"
  value       = azurerm_kubernetes_cluster.main.kube_config
  sensitive   = true
}

output "node_resource_group" {
  description = "The auto-generated resource group name for cluster resources"
  value       = azurerm_kubernetes_cluster.main.node_resource_group
}

output "ai_node_pool_id" {
  description = "The ID of the AI workload node pool"
  value       = azurerm_kubernetes_cluster_node_pool.ai.id
}

output "ai_node_pool_name" {
  description = "The name of the AI workload node pool"
  value       = azurerm_kubernetes_cluster_node_pool.ai.name
}