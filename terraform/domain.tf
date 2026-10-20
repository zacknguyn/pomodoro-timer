resource "aws_route53_zone" "site" {
  count = var.hosted_zone_id == "" ? 1 : 0
  name  = var.domain_name
}

locals {
  hosted_zone_id = var.hosted_zone_id != "" ? var.hosted_zone_id : aws_route53_zone.site[0].zone_id
}

resource "aws_acm_certificate" "site" {
  provider          = aws.certificates
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "certificate" {
  zone_id = local.hosted_zone_id
  name    = one(aws_acm_certificate.site.domain_validation_options).resource_record_name
  type    = one(aws_acm_certificate.site.domain_validation_options).resource_record_type
  ttl     = 60
  records = [one(aws_acm_certificate.site.domain_validation_options).resource_record_value]
}

resource "aws_acm_certificate_validation" "site" {
  provider                = aws.certificates
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [aws_route53_record.certificate.fqdn]
}

resource "aws_route53_record" "site" {
  for_each = toset(["A", "AAAA"])
  zone_id  = local.hosted_zone_id
  name     = var.domain_name
  type     = each.value

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_acm_certificate" "api" {
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "api_certificate" {
  zone_id = local.hosted_zone_id
  name    = one(aws_acm_certificate.api.domain_validation_options).resource_record_name
  type    = one(aws_acm_certificate.api.domain_validation_options).resource_record_type
  ttl     = 60
  records = [one(aws_acm_certificate.api.domain_validation_options).resource_record_value]
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [aws_route53_record.api_certificate.fqdn]
}

resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.${var.domain_name}"
  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.api.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.api.id
}

resource "aws_route53_record" "api" {
  zone_id = local.hosted_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
