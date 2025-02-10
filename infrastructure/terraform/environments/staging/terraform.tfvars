# Project and Environment Configuration
project_name = "ai-excel-addin"
environment  = "staging"
location     = "eastus"
secondary_location = "westeurope"

# Resource Tags
resource_tags = {
  application = "ai-excel-addin"
  environment = "staging"
  managed_by  = "terraform"
  criticality = "medium"
}

# AKS Configuration
aks_config = {
  kubernetes_version = "1.25"
  default_node_pool = {
    node_count         = 3
    vm_size           = "Standard_DS2_v2"
    enable_auto_scaling = true
    min_count         = 2
    max_count         = 6
  }
  ai_node_pool = {
    name              = "aipool"
    vm_size          = "Standard_NC6s_v3"
    node_count       = 2
    enable_auto_scaling = true
    min_count        = 1
    max_count        = 4
  }
}

# Azure SQL Configuration
sql_config = {
  edition               = "GeneralPurpose"
  performance_level     = "GP_Gen5_4"
  enable_geo_replication = true
  enable_failover_group = true
  minimum_tls_version   = "1.2"
  enable_azure_services = true
}

# Azure Redis Cache Configuration
redis_config = {
  sku                   = "Premium"
  family                = "P"
  capacity              = 1
  enable_non_ssl_port   = false
  enable_geo_replication = true
  maxmemory_policy      = "allkeys-lru"
}

# Monitoring Configuration
monitoring_config = {
  retention_days             = 30
  enable_alerts             = true
  enable_diagnostic_settings = true
  log_analytics_sku         = "PerGB2018"
  action_group_email        = "staging-alerts@company.com"
}