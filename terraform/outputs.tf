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
  description = "HTTPS URL for the generated CloudFront hostname."
  value       = "https://${aws_cloudfront_distribution.site.domain_name}"
}
