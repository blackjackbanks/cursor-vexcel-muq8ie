# Configure Terraform settings and required providers
terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes" 
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Configure Azure Resource Manager provider
provider "azurerm" {
  environment = var.environment
  location    = var.location
  
  features {
    key_vault {
      purge_soft_delete_on_destroy               = true
      recover_soft_deleted_key_vaults            = true
      purge_soft_deleted_secrets_on_destroy      = true
    }
    
    resource_group {
      prevent_deletion_if_contains_resources     = true
      prevent_deletion_if_contains_resources_timeout = "1h"
    }
    
    virtual_machine {
      delete_os_disk_on_deletion                 = true
      graceful_shutdown                          = true
      skip_shutdown_and_force_delete             = false
    }
    
    api_management {
      purge_soft_delete_on_destroy              = true
      recover_soft_deleted                       = true
    }
    
    cognitive_account {
      purge_soft_delete_on_destroy              = true
    }
  }

  metadata_host          = "management.azure.com"
  skip_provider_registration = false
  storage_use_azuread   = true
  use_msi               = true
}

# Configure Kubernetes provider
provider "kubernetes" {
  host                   = data.azurerm_kubernetes_cluster.main.kube_config.0.host
  client_certificate     = base64decode(data.azurerm_kubernetes_cluster.main.kube_config.0.client_certificate)
  client_key             = base64decode(data.azurerm_kubernetes_cluster.main.kube_config.0.client_key)
  cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.main.kube_config.0.cluster_ca_certificate)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "kubelogin"
    args        = ["get-token", "--login", "spn", "--environment", "AzurePublicCloud"]
  }
}

# Configure Helm provider
provider "helm" {
  kubernetes {
    host                   = data.azurerm_kubernetes_cluster.main.kube_config.0.host
    client_certificate     = base64decode(data.azurerm_kubernetes_cluster.main.kube_config.0.client_certificate)
    client_key             = base64decode(data.azurerm_kubernetes_cluster.main.kube_config.0.client_key)
    cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.main.kube_config.0.cluster_ca_certificate)
  }
  
  registry {
    url      = "https://charts.helm.sh/stable"
    username = var.helm_registry_username
    password = var.helm_registry_password
  }
  
  experiments {
    manifest = true
  }
}