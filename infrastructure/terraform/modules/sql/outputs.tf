# SQL Server Outputs
output "server_id" {
  description = "The resource ID of the Azure SQL Server"
  value       = azurerm_mssql_server.main.id
}

output "server_name" {
  description = "The name of the Azure SQL Server"
  value       = azurerm_mssql_server.main.name
}

output "server_fqdn" {
  description = "The fully qualified domain name of the Azure SQL Server"
  value       = azurerm_mssql_server.main.fully_qualified_domain_name
}

# SQL Database Outputs
output "database_id" {
  description = "The resource ID of the Azure SQL Database"
  value       = azurerm_mssql_database.main.id
}

output "database_name" {
  description = "The name of the Azure SQL Database"
  value       = azurerm_mssql_database.main.name
}

# Secondary Server Outputs
output "secondary_server_id" {
  description = "The resource ID of the secondary Azure SQL Server"
  value       = azurerm_mssql_server.secondary.id
}

output "secondary_server_name" {
  description = "The name of the secondary Azure SQL Server"
  value       = azurerm_mssql_server.secondary.name
}

output "secondary_server_fqdn" {
  description = "The fully qualified domain name of the secondary Azure SQL Server"
  value       = azurerm_mssql_server.secondary.fully_qualified_domain_name
}

# Failover Group Outputs
output "failover_group_id" {
  description = "The resource ID of the failover group for high availability"
  value       = azurerm_mssql_failover_group.main.id
}

output "failover_group_name" {
  description = "The name of the failover group"
  value       = azurerm_mssql_failover_group.main.name
}

# Connection String Outputs
output "primary_connection_string" {
  description = "The secure connection string for the primary Azure SQL Database"
  value       = "Server=tcp:${azurerm_mssql_server.main.fully_qualified_domain_name},1433;Database=${azurerm_mssql_database.main.name};Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;"
  sensitive   = true
}

output "secondary_connection_string" {
  description = "The secure connection string for the secondary Azure SQL Database"
  value       = "Server=tcp:${azurerm_mssql_server.secondary.fully_qualified_domain_name},1433;Database=${azurerm_mssql_database.main.name};Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;"
  sensitive   = true
}

output "failover_group_connection_string" {
  description = "The secure connection string using the failover group endpoint"
  value       = "Server=tcp:${azurerm_mssql_failover_group.main.name}.database.windows.net,1433;Database=${azurerm_mssql_database.main.name};Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;"
  sensitive   = true
}

# Audit Configuration Outputs
output "audit_storage_account_id" {
  description = "The resource ID of the storage account used for SQL auditing"
  value       = azurerm_storage_account.audit.id
}

output "audit_storage_account_name" {
  description = "The name of the storage account used for SQL auditing"
  value       = azurerm_storage_account.audit.name
}

# Private Endpoint Outputs
output "private_endpoint_id" {
  description = "The resource ID of the SQL server private endpoint"
  value       = azurerm_private_endpoint.sql_endpoint.id
}

output "private_endpoint_ip" {
  description = "The private IP address of the SQL server private endpoint"
  value       = azurerm_private_endpoint.sql_endpoint.private_service_connection[0].private_ip_address
}