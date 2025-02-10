# Development environment configuration for AI-enhanced Excel Add-in
# This file contains environment-specific variable definitions for the development deployment

# Core project settings
project_name = "ai-excel-addin-dev"
environment  = "dev"
location     = "eastus"

# Resource tagging strategy for development environment
resource_tags = {
  application          = "ai-excel-addin"
  environment          = "dev"
  managed_by          = "terraform"
  cost_center         = "development"
  owner               = "development-team"
  criticality         = "low"
  data_classification = "internal"
  hours_of_operation  = "business-hours"
}

# AKS cluster configuration for development
aks_config = {
  kubernetes_version     = "1.25"
  node_count            = 2
  vm_size               = "Standard_DS2_v2"
  enable_auto_scaling   = true
  min_node_count        = 2
  max_node_count        = 4
  os_disk_size_gb       = 128
  max_pods              = 30
  network_plugin        = "azure"
  load_balancer_sku     = "standard"
  enable_node_public_ip = false
  availability_zones    = ["1"]
  enable_host_encryption = true
  enable_pod_security_policy = true
  auto_shutdown_enabled = true
  auto_shutdown_time    = "2000"
  auto_shutdown_timezone = "UTC"
}

# Azure SQL configuration for development
sql_config = {
  edition                        = "GeneralPurpose"
  family                        = "Gen5"
  capacity                      = 2
  size_gb                       = 32
  backup_retention_days         = 7
  geo_redundant_backup          = false
  auto_pause_delay_minutes      = 60
  min_capacity                  = 0.5
  max_capacity                  = 2
  read_scale                    = false
  zone_redundant               = false
  enable_threat_detection      = true
  enable_vulnerability_assessment = true
  connection_policy            = "Default"
  maintenance_window = {
    day_of_week  = 0
    start_hour   = 0
    start_minute = 0
  }
}

# Redis Cache configuration for development
redis_config = {
  sku                              = "Standard"
  family                          = "C"
  capacity                        = 1
  enable_non_ssl_port             = false
  enable_geo_replication          = false
  maxmemory_policy                = "volatile-lru"
  maxfragmentationmemory_reserved = 50
  maxmemory_delta                 = 50
  backup_frequency                = 0
  patch_schedule = {
    day_of_week    = "Sunday"
    start_hour_utc = 1
  }
  enable_authentication   = true
  minimum_tls_version    = "1.2"
  public_network_access  = "Enabled"
  redis_version         = "6.0"
}

# Monitoring configuration for development
monitoring_config = {
  retention_days             = 30
  enable_container_insights  = true
  enable_application_insights = true
  daily_quota_gb            = 5
  sampling_percentage       = 100
  disable_ip_masking       = false
  workspace_sku            = "PerGB2018"
  collection_interval      = "60s"
  alert_rules = {
    cpu_threshold          = 80
    memory_threshold       = 80
    disk_threshold        = 80
    response_time_threshold = 5
  }
  diagnostic_settings = {
    metrics_category_enabled = true
    logs_category_enabled   = true
    enable_platform_logs   = true
  }
}