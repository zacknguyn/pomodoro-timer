variable "project_name" {
  description = "Short project name used in AWS resource names and tags."
  type        = string
  default     = "pomogit"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$", var.project_name))
    error_message = "project_name must be 3-32 lowercase letters, numbers, or hyphens."
  }
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,14}$", var.environment))
    error_message = "environment must be 1-15 lowercase letters, numbers, or hyphens."
  }
}

variable "aws_region" {
  description = "AWS region for the S3 origin. CloudFront is a global service."
  type        = string
  default     = "us-west-2"
}

variable "cloudfront_price_class" {
  description = "CloudFront edge-location price class. PriceClass_100 is the lowest-cost option."
  type        = string
  default     = "PriceClass_100"

  validation {
    condition = contains(
      ["PriceClass_100", "PriceClass_200", "PriceClass_All"],
      var.cloudfront_price_class,
    )
    error_message = "cloudfront_price_class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "force_destroy_bucket" {
  description = "Allow Terraform to delete a non-empty site bucket. Keep false outside disposable environments."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags to merge into every taggable resource."
  type        = map(string)
  default     = {}
}

variable "account_id" {
  description = "Expected AWS account; prevents applying to a different authenticated account."
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.account_id))
    error_message = "account_id must be the intended 12-digit AWS account."
  }
}

variable "domain_name" {
  description = "Public hostname served by CloudFront, for example pomogit.example."
  type        = string
}

variable "site_paused" {
  description = "Serve a maintenance page and remove public API access while preserving data and infrastructure."
  type        = bool
  default     = false
}

variable "hosted_zone_id" {
  description = "Existing Route 53 zone ID; leave empty to create a zone for domain_name."
  type        = string
  default     = ""
}

variable "database_url" {
  description = "Private Neon URL for the restricted pomogit_runtime login, without query parameters."
  type        = string
  sensitive   = true
}

variable "migration_database_url" {
  description = "Private schema-owner Neon URL, available only to the IAM-only migration function."
  type        = string
  sensitive   = true

  validation {
    condition     = var.migration_database_url != var.database_url
    error_message = "API and migrations require separate database credentials."
  }
}

variable "github_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "better_auth_secret" {
  description = "Private random signing secret for Better Auth; API only."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.better_auth_secret) >= 32
    error_message = "Better Auth requires a private random secret of at least 32 characters."
  }
}

variable "database_ca_cert" {
  type      = string
  sensitive = true
  default   = ""
}

variable "github_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "lambda_zip_path" {
  description = "Packaged Linux x86_64 Lambda zip from the AWS deployment CLI."
  type        = string
}

variable "budget_email" {
  description = "Recipient of account-wide $5 and $10 actual-cost alerts. Budgets are not a spending cap."
  type        = string
}
