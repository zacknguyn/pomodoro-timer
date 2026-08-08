provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      {
        Application = var.project_name
        Environment = var.environment
        ManagedBy   = "Terraform"
      },
      var.tags,
    )
  }
}

data "aws_caller_identity" "current" {}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}
