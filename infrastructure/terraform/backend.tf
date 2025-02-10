# Backend configuration for Terraform state management
# Version: Azure RM Provider ~> 3.0
# Purpose: Configures secure and scalable state storage for multi-region infrastructure deployment

terraform {
  backend "azurerm" {
    # Resource group containing the storage account for state management
    resource_group_name = "rg-excel-addin-tfstate-${var.environment}"
    
    # Storage account name for state file storage (must be globally unique)
    storage_account_name = "stexceladdinstate${var.environment}"
    
    # Container name for state file organization
    container_name = "tfstate"
    
    # Dynamic state file path incorporating environment
    key = "${var.environment}/excel-addin.tfstate"
    
    # Enable Azure AD authentication for enhanced security
    use_azuread_auth = true
    
    # Azure subscription ID for resource access
    subscription_id = "${var.subscription_id}"
    
    # State file encryption configuration
    min_tls_version = "TLS1_2"
    
    # State locking configuration for concurrent access prevention
    lease_duration = "60"
    lease_retry_attempts = "5"
    
    # Network security rules - restrict access to authorized networks only
    network_rules {
      default_action = "Deny"
      bypass = ["AzureServices"]
      ip_rules = []
      virtual_network_subnet_ids = []
    }
    
    # Blob storage configuration for state file versioning
    versioning_enabled = true
    
    # Retention policy for state file versions
    retention_days = 30
  }

  # Required provider configuration
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}