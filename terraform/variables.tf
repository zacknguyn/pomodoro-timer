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
