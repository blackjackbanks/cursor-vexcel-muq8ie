# Project and Environment Configuration
project_name = "ai-excel-addin"
environment  = "prod"
location     = "eastus"
secondary_location = "westeurope"

# Resource Tags for Production Environment
resource_tags = {
  application         = "ai-excel-addin"
  environment         = "prod"
  managed_by         = "terraform"
  criticality        = "high"
  data_classification = "confidential"
}

# Production AKS Cluster Configuration
aks_config = {
  kubernetes_version  = "1.25"
  node_count         = 5
  vm_size           = "Standard_DS3_v2"
  enable_auto_scaling = true
  min_node_count     = 5
  max_node_count     = 10
}

# Production Azure SQL Database Configuration
sql_config = {
  edition               = "BusinessCritical"
  family               = "Gen5"
  capacity             = 8
  size_gb              = 256
  backup_retention_days = 35
  geo_redundant_backup  = true
  enable_failover_group = true
}

# Production Redis Cache Configuration
redis_config = {
  sku                   = "Premium"
  family                = "P"
  capacity              = 2
  enable_non_ssl_port   = false
  enable_geo_replication = true
  maxmemory_policy      = "allkeys-lru"
  enable_backup         = true
  backup_frequency      = 60
}

# Production Monitoring Configuration
monitoring_config = {
  retention_days                   = 90
  enable_container_insights        = true
  enable_application_insights      = true
  enable_advanced_threat_protection = true
  enable_diagnostic_settings       = true
  log_analytics_sku               = "PerGB2018"
}