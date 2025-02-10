# Azure Monitor Module
# Configures monitoring infrastructure including Log Analytics workspace, Application Insights,
# and monitoring resources with comprehensive observability setup

# Required providers
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

# Local variables for common configuration
locals {
  common_tags = {
    Environment        = var.environment
    ManagedBy         = "Terraform"
    Project           = "AI Excel Add-in"
    Component         = "Monitoring"
    SecurityLevel     = "High"
    DataClassification = "Confidential"
  }
  
  # Resource naming convention
  workspace_name = "log-${var.environment}-${var.location}-001"
  appinsights_name = "ai-${var.environment}-${var.location}-001"
  action_group_name = "ag-${var.environment}-${var.location}-001"
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = local.workspace_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.workspace_sku
  retention_in_days   = var.log_retention_days
  
  # Enhanced security features
  internet_ingestion_enabled = true
  internet_query_enabled     = true
  
  # Advanced settings
  daily_quota_gb                     = 10
  reservation_capacity_in_gb_per_day = 100
  
  tags = local.common_tags
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = local.appinsights_name
  location            = var.location
  resource_group_name = var.resource_group_name
  application_type    = "web"
  workspace_id        = azurerm_log_analytics_workspace.main.id
  retention_in_days   = var.log_retention_days
  
  # Security and sampling settings
  sampling_percentage             = 100
  disable_ip_masking             = false
  local_authentication_disabled   = true
  
  tags = local.common_tags
}

# Monitor Action Group for Alerts
resource "azurerm_monitor_action_group" "main" {
  name                = local.action_group_name
  resource_group_name = var.resource_group_name
  short_name          = "AlertGroup"
  enabled             = true

  dynamic "email_receiver" {
    for_each = var.alert_notification_emails
    content {
      name                    = "Email-${index}"
      email_address          = email_receiver.value
      use_common_alert_schema = true
    }
  }

  tags = local.common_tags
}

# Performance Metric Alerts
resource "azurerm_monitor_metric_alert" "response_time" {
  name                = "alert-response-time-${var.environment}"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Alert when response time exceeds threshold"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "requests/duration"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = var.performance_thresholds.response_time
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
    webhook_properties = {
      alertType = "Performance"
      severity  = "High"
    }
  }

  tags = local.common_tags
}

resource "azurerm_monitor_metric_alert" "cpu_usage" {
  name                = "alert-cpu-usage-${var.environment}"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Alert when CPU usage exceeds threshold"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "cpu/percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = var.performance_thresholds.cpu_percent
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = local.common_tags
}

resource "azurerm_monitor_metric_alert" "memory_usage" {
  name                = "alert-memory-usage-${var.environment}"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Alert when memory usage exceeds threshold"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "memory/percentage"
    aggregation      = "Maximum"
    operator         = "GreaterThan"
    threshold        = var.performance_thresholds.memory_percent
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = local.common_tags
}

# Outputs for other modules to consume
output "log_analytics_workspace" {
  value = {
    id                  = azurerm_log_analytics_workspace.main.id
    name                = azurerm_log_analytics_workspace.main.name
    primary_shared_key  = azurerm_log_analytics_workspace.main.primary_shared_key
  }
  sensitive = true
}

output "application_insights" {
  value = {
    id                  = azurerm_application_insights.main.id
    instrumentation_key = azurerm_application_insights.main.instrumentation_key
    connection_string   = azurerm_application_insights.main.connection_string
    app_id             = azurerm_application_insights.main.app_id
  }
  sensitive = true
}

output "action_group" {
  value = {
    id   = azurerm_monitor_action_group.main.id
    name = azurerm_monitor_action_group.main.name
  }
}