# Azure SQL Database Terraform Module
# Version: 1.0.0
# Provider Requirements:
# - azurerm ~> 3.0

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Local variables for resource naming and tagging
locals {
  server_name = "${var.server_name_prefix}-${var.environment}-${var.location}"
  tags = merge(var.tags, {
    Environment   = var.environment
    Module        = "sql"
    ManagedBy     = "terraform"
    SecurityLevel = "high"
  })
  default_firewall_rules = {
    allow_azure_services = {
      start_ip = "0.0.0.0"
      end_ip   = "0.0.0.0"
    }
  }
}

# Primary SQL Server
resource "azurerm_mssql_server" "main" {
  name                         = local.server_name
  resource_group_name          = var.resource_group_name
  location                     = var.location
  version                      = "12.0"
  administrator_login          = var.administrator_login
  administrator_login_password = var.administrator_password
  minimum_tls_version         = var.minimum_tls_version
  public_network_access_enabled = false

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}

# Secondary SQL Server for Geo-Replication
resource "azurerm_mssql_server" "secondary" {
  name                         = "${local.server_name}-secondary"
  resource_group_name          = var.resource_group_name
  location                     = var.secondary_location
  version                      = "12.0"
  administrator_login          = var.administrator_login
  administrator_login_password = var.administrator_password
  minimum_tls_version         = var.minimum_tls_version
  public_network_access_enabled = false

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}

# Primary Database
resource "azurerm_mssql_database" "main" {
  name                = var.database_name
  server_id          = azurerm_mssql_server.main.id
  sku_name           = var.sku_name
  max_size_gb        = var.environment == "prod" ? 512 : 128
  zone_redundant     = var.environment == "prod" ? true : false
  read_scale         = var.environment == "prod" ? true : false

  short_term_retention_policy {
    retention_days = var.environment == "prod" ? 7 : 1
  }

  long_term_retention_policy {
    weekly_retention  = var.environment == "prod" ? "P4W" : null
    monthly_retention = var.environment == "prod" ? "P12M" : null
    yearly_retention  = var.environment == "prod" ? "P5Y" : null
    week_of_year     = var.environment == "prod" ? 1 : null
  }

  tags = local.tags
}

# Failover Group Configuration
resource "azurerm_mssql_failover_group" "main" {
  name                = "${var.database_name}-fog"
  server_id           = azurerm_mssql_server.main.id
  databases           = [azurerm_mssql_database.main.id]
  partner_server {
    id = azurerm_mssql_server.secondary.id
  }

  read_write_endpoint_failover_policy {
    mode          = "Automatic"
    grace_minutes = 60
  }

  readonly_endpoint_failover_policy {
    mode = "Enabled"
  }

  tags = local.tags
}

# Firewall Rules
resource "azurerm_mssql_firewall_rule" "rules" {
  for_each = merge(local.default_firewall_rules, var.firewall_rules)

  name             = each.key
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = each.value.start_ip
  end_ip_address   = each.value.end_ip
}

# Secondary Server Firewall Rules
resource "azurerm_mssql_firewall_rule" "secondary_rules" {
  for_each = merge(local.default_firewall_rules, var.firewall_rules)

  name             = each.key
  server_id        = azurerm_mssql_server.secondary.id
  start_ip_address = each.value.start_ip
  end_ip_address   = each.value.end_ip
}

# Transparent Data Encryption
resource "azurerm_mssql_database_extended_auditing_policy" "main" {
  database_id                             = azurerm_mssql_database.main.id
  storage_endpoint                        = azurerm_storage_account.audit.primary_blob_endpoint
  storage_account_access_key             = azurerm_storage_account.audit.primary_access_key
  retention_in_days                      = var.environment == "prod" ? 90 : 30
  log_monitoring_enabled                 = true
}

# Audit Storage Account
resource "azurerm_storage_account" "audit" {
  name                     = "${replace(local.server_name, "-", "")}audit"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  min_tls_version         = "TLS1_2"
  
  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
  }

  tags = local.tags
}

# Private Endpoint Configuration
resource "azurerm_private_endpoint" "sql_endpoint" {
  name                = "${local.server_name}-endpoint"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "${local.server_name}-privatelink"
    private_connection_resource_id = azurerm_mssql_server.main.id
    is_manual_connection          = false
    subresource_names            = ["sqlServer"]
  }

  tags = local.tags
}