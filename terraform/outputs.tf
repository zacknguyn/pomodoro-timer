output "deployment_account_id" {
  description = "AWS account that owns this deployment."
  value       = data.aws_caller_identity.current.account_id
}

output "deployment_region" {
  description = "AWS region containing the application functions."
  value       = var.aws_region
}

output "site_bucket_name" {
  description = "Private S3 bucket that receives the frontend build output."
  value       = aws_s3_bucket.site.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID used for cache invalidations after deployment."
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN used by the future CI/CD deploy role."
  value       = aws_cloudfront_distribution.site.arn
}

output "cloudfront_domain_name" {
  description = "Generated CloudFront hostname for the frontend."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "site_url" {
  description = "Public HTTPS URL for the configured custom domain."
  value       = "https://${var.domain_name}"
}

output "api_url" {
  value = "https://api.${var.domain_name}"
}

output "site_paused" {
  value = var.site_paused
}

output "api_function_name" {
  value = aws_lambda_function.api.function_name
}

output "migration_function_name" {
  value = aws_lambda_function.migrate.function_name
}

output "nameservers" {
  value = var.hosted_zone_id == "" ? aws_route53_zone.site[0].name_servers : []
}

output "hosted_zone_id" {
  value = local.hosted_zone_id
}
