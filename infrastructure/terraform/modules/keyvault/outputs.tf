# Key Vault Resource Identifier
output "key_vault_id" {
  description = "The ID of the Key Vault used for resource references and RBAC assignments"
  value       = azurerm_key_vault.main.id
  sensitive   = false
}

# Key Vault Resource Name
output "key_vault_name" {
  description = "The name of the Key Vault used for resource identification and access policies"
  value       = azurerm_key_vault.main.name
  sensitive   = false
}

# Key Vault URI for Secure Access
output "key_vault_uri" {
  description = "The URI of the Key Vault for accessing secrets and keys through properly authenticated and authorized requests"
  value       = azurerm_key_vault.main.vault_uri
  sensitive   = false
}