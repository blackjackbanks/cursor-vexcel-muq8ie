# Output definitions for the AKS module
# Version: 1.0.0
# These outputs expose essential cluster information for use by other modules
# while maintaining security best practices for sensitive data

output "cluster_id" {
  description = "The ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.id
  sensitive   = false
}

output "kube_config" {
  description = "Kubernetes configuration for cluster access and management"
  value       = azurerm_kubernetes_cluster.main.kube_config
  sensitive   = true # Marked sensitive to prevent exposure in logs and output
}

output "node_resource_group" {
  description = "The auto-generated resource group which contains the AKS node pools"
  value       = azurerm_kubernetes_cluster.main.node_resource_group
  sensitive   = false
}

output "ai_node_pool_id" {
  description = "The ID of the GPU-enabled node pool for AI workloads"
  value       = azurerm_kubernetes_cluster_node_pool.ai.id
  sensitive   = false
}