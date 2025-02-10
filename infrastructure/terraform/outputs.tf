# Azure Infrastructure Outputs
# Version: 1.0.0
# This file defines output variables that expose critical infrastructure details
# from all child modules while maintaining security best practices

# Kubernetes Cluster Outputs
output "kubernetes_clusters" {
  description = "Details of the AKS clusters across regions"
  value = {
    primary = {
      cluster_id       = module.aks_primary.cluster_id
      kube_config      = module.aks_primary.kube_config
      resource_group   = module.aks_primary.node_resource_group
      endpoints        = module.aks_primary.cluster_endpoints
    }
    secondary = {
      cluster_id       = module.aks_secondary.cluster_id
      kube_config      = module.aks_secondary.kube_config
      resource_group   = module.aks_secondary.node_resource_group
      endpoints        = module.aks_secondary.cluster_endpoints
    }
    gpu_nodes = {
      primary_pool_id   = module.aks_primary.ai_node_pool_id
      secondary_pool_id = module.aks_secondary.ai_node_pool_id
    }
    monitoring = {
      primary_metrics   = module.aks_primary.monitor_metrics
      secondary_metrics = module.aks_secondary.monitor_metrics
    }
  }
  sensitive = true
}

# Database Configuration Outputs
output "database_configuration" {
  description = "SQL Database connection and configuration details"
  value = {
    connection_strings = {
      primary          = module.sql.primary_connection_string
      secondary        = module.sql.secondary_connection_string
      failover_group   = module.sql.failover_group_connection_string
    }
    failover_groups = {
      name = module.sql.failover_group_name
      id   = module.sql.failover_group_id
    }
    geo_replication = {
      links = module.sql.geo_replication_links
      status = module.sql.failover_group_status
    }
    security = {
      private_endpoint_id = module.sql.private_endpoint_id
      audit_storage_id   = module.sql.audit_storage_account_id
    }
  }
  sensitive = true
}

# Redis Cache Configuration Outputs
output "redis_configuration" {
  description = "Redis Cache connection and configuration details"
  value = {
    primary = {
      hostname = module.redis.redis_hostname
      ssl_port = module.redis.redis_ssl_port
      connection_string = module.redis.redis_connection_string
    }
    secondary = {
      hostname = module.redis_secondary.redis_hostname
      ssl_port = module.redis_secondary.redis_ssl_port
      connection_string = module.redis_secondary.redis_connection_string
    }
    geo_replication = {
      status = module.redis.geo_replication_status
      links  = module.redis.geo_replication_links
    }
    performance = {
      metrics = module.redis.performance_metrics
      alerts  = module.redis.alert_rules
    }
  }
  sensitive = true
}

# Resource Group Outputs
output "resource_groups" {
  description = "Resource group IDs across regions"
  value = {
    primary_id = azurerm_resource_group.primary.id
    secondary_id = azurerm_resource_group.secondary.id
    disaster_recovery_id = azurerm_resource_group.dr.id
  }
  sensitive = false
}

# Monitoring Endpoints Outputs
output "monitoring_endpoints" {
  description = "Monitoring and observability endpoints"
  value = {
    application_insights = azurerm_application_insights.main.connection_string
    log_analytics = azurerm_log_analytics_workspace.main.primary_shared_key
    metrics = {
      primary_region = azurerm_monitor_diagnostic_setting.primary.id
      secondary_region = azurerm_monitor_diagnostic_setting.secondary.id
    }
    alerts = {
      action_group = azurerm_monitor_action_group.main.id
      rules = azurerm_monitor_metric_alert.main[*].id
    }
  }
  sensitive = true
}