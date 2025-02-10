# Azure Kubernetes Service (AKS) module variables
# Version: 1.0.0
# This file defines all variables required for AKS cluster deployment including
# cluster configuration, node pools, networking, and monitoring settings

variable "resource_group_name" {
  description = "Name of the resource group where AKS cluster will be deployed"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9-]{3,24}$", var.resource_group_name))
    error_message = "Resource group name must be 3-24 characters, lowercase alphanumeric with hyphens"
  }
}

variable "location" {
  description = "Azure region where AKS cluster will be deployed"
  type        = string
  validation {
    condition     = contains(["eastus", "westeurope", "eastasia"], var.location)
    error_message = "Location must be one of: eastus, westeurope, eastasia"
  }
}

variable "kubernetes_version" {
  description = "Kubernetes version for AKS cluster"
  type        = string
  default     = "1.25"
  validation {
    condition     = can(regex("^1\\.2[5-9]$", var.kubernetes_version))
    error_message = "Kubernetes version must be 1.25 or higher"
  }
}

variable "node_pool_config" {
  description = "Configuration for system and AI node pools"
  type = object({
    system_pool = object({
      name               = string
      vm_size           = string
      node_count        = number
      enable_auto_scaling = bool
      min_count         = number
      max_count         = number
    })
    ai_pool = object({
      name               = string
      vm_size           = string
      node_count        = number
      enable_auto_scaling = bool
      min_count         = number
      max_count         = number
    })
  })
  default = {
    system_pool = {
      name               = "systempool"
      vm_size           = "Standard_DS2_v2"
      node_count        = 3
      enable_auto_scaling = true
      min_count         = 3
      max_count         = 6
    }
    ai_pool = {
      name               = "aipool"
      vm_size           = "Standard_NC6s_v3"
      node_count        = 2
      enable_auto_scaling = true
      min_count         = 2
      max_count         = 8
    }
  }
}

variable "network_config" {
  description = "Network configuration for AKS cluster"
  type = object({
    network_plugin      = string
    network_policy     = string
    service_cidr       = string
    dns_service_ip     = string
    docker_bridge_cidr = string
  })
  default = {
    network_plugin      = "azure"
    network_policy     = "azure"
    service_cidr       = "10.0.0.0/16"
    dns_service_ip     = "10.0.0.10"
    docker_bridge_cidr = "172.17.0.1/16"
  }
  validation {
    condition     = contains(["azure", "kubenet"], var.network_config.network_plugin) && contains(["azure", "calico"], var.network_config.network_policy)
    error_message = "Invalid network plugin or policy configuration"
  }
}

variable "monitoring_config" {
  description = "Monitoring and logging configuration"
  type = object({
    enable_metrics  = bool
    enable_logs    = bool
    retention_days = number
    workspace_id   = string
  })
  default = {
    enable_metrics  = true
    enable_logs    = true
    retention_days = 30
    workspace_id   = null
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    service     = "ai-excel-addin"
    environment = "production"
    managed_by  = "terraform"
    component   = "aks"
  }
}