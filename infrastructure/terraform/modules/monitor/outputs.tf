# Log Analytics Workspace outputs
output "log_analytics_workspace_id" {
  description = "The ID of the Log Analytics workspace for centralized logging and monitoring"
  value       = log_analytics_workspace.id
  sensitive   = false
}

output "log_analytics_workspace_name" {
  description = "The name of the Log Analytics workspace for resource identification"
  value       = log_analytics_workspace.name
  sensitive   = false
}

# Application Insights outputs
output "application_insights_id" {
  description = "The ID of the Application Insights resource for telemetry configuration"
  value       = application_insights.id
  sensitive   = false
}

output "application_insights_instrumentation_key" {
  description = "The instrumentation key for Application Insights telemetry configuration"
  value       = application_insights.instrumentation_key
  sensitive   = true # Marked sensitive to protect the key
}

output "application_insights_connection_string" {
  description = "The connection string for Application Insights monitoring integration"
  value       = application_insights.connection_string
  sensitive   = true # Marked sensitive to protect the connection string
}

# Action Group outputs
output "action_group_id" {
  description = "The ID of the Action Group for alert and notification configuration"
  value       = action_group.id
  sensitive   = false
}