provider "aws" {
  region              = var.aws_region
  allowed_account_ids = [var.account_id]

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

provider "aws" {
  alias               = "certificates"
  region              = "us-east-1"
  allowed_account_ids = [var.account_id]
}

data "aws_caller_identity" "current" {}

locals {
  # AWS-managed policy IDs: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
  static_cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
}
