# Redis Cache Module Outputs
# Version: 1.0.0
# Defines output variables for the Redis Cache module that expose essential
# connection and configuration details while maintaining security best practices

output "redis_instance_name" {
  description = "The name of the Redis Cache instance for service identification and reference"
  value       = azurerm_redis_cache.cache.name
  sensitive   = false
}

output "redis_hostname" {
  description = "The hostname of the Redis Cache instance for client connection configuration"
  value       = azurerm_redis_cache.cache.hostname
  sensitive   = false
}

output "redis_ssl_port" {
  description = "The SSL port of the Redis Cache instance for secure TLS connections"
  value       = azurerm_redis_cache.cache.ssl_port
  sensitive   = false
}

output "redis_connection_string" {
  description = "The primary connection string of the Redis Cache instance for secure client authentication and connection"
  value       = azurerm_redis_cache.cache.primary_connection_string
  sensitive   = true
}