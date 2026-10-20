mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
    }
  }

  mock_resource "aws_acm_certificate" {
    defaults = {
      arn = "arn:aws:acm:us-east-1:123456789012:certificate/mock"
      domain_validation_options = [
        {
          domain_name           = "pomogit.example"
          resource_record_name  = "_validation.pomogit.example"
          resource_record_type  = "CNAME"
          resource_record_value = "_validation.acm-validations.aws"
        }
      ]
    }
  }
}

mock_provider "aws" {
  alias = "certificates"

  mock_resource "aws_acm_certificate" {
    defaults = {
      arn = "arn:aws:acm:us-east-1:123456789012:certificate/mock"
      domain_validation_options = [
        {
          domain_name           = "pomogit.example"
          resource_record_name  = "_validation.pomogit.example"
          resource_record_type  = "CNAME"
          resource_record_value = "_validation.acm-validations.aws"
        }
      ]
    }
  }
}

variables {
  account_id             = "123456789012"
  domain_name            = "pomogit.example"
  hosted_zone_id         = "ZEXAMPLE"
  database_url           = "postgresql://placeholder@db.example/pomogit"
  migration_database_url = "postgresql://owner@db.example/pomogit"
  better_auth_secret     = "test-only-secret-for-mocked-infrastructure-plan"
  lambda_zip_path        = "tests/lambda.fixture"
  budget_email           = "operator@example.com"
}

run "showcase_safety" {
  command = plan

  assert {
    condition = (
      aws_lambda_function.api.environment[0].variables.DATABASE_URL != aws_lambda_function.migrate.environment[0].variables.DATABASE_URL &&
      !contains(keys(aws_lambda_function.api.environment[0].variables), "MIGRATION_DATABASE_URL") &&
      !contains(keys(aws_lambda_function.migrate.environment[0].variables), "GITHUB_CLIENT_SECRET") &&
      !contains(keys(aws_lambda_function.migrate.environment[0].variables), "BETTER_AUTH_SECRET") &&
      aws_lambda_function.migrate.environment[0].variables.RUNTIME_DATABASE_ROLE == "pomogit_runtime"
    )
    error_message = "API and migrations must isolate database credentials and OAuth secrets."
  }

  assert {
    condition = (
      length(aws_lambda_function.api.vpc_config) == 0 &&
      coalesce(aws_lambda_function.api.reserved_concurrent_executions, -1) == -1 &&
      coalesce(aws_lambda_function.migrate.reserved_concurrent_executions, -1) == -1 &&
      aws_apigatewayv2_stage.api.default_route_settings[0].throttling_rate_limit == 10 &&
      aws_apigatewayv2_stage.api.default_route_settings[0].throttling_burst_limit == 20
    )
    error_message = "The showcase must avoid VPC/NAT, share default Lambda concurrency, and retain API throttles."
  }

  assert {
    condition = (
      length(aws_cloudfront_distribution.site.ordered_cache_behavior) == 0 &&
      aws_apigatewayv2_api.api.disable_execute_api_endpoint &&
      aws_apigatewayv2_domain_name.api.domain_name == "api.pomogit.example" &&
      aws_lambda_function.api.environment[0].variables.API_URL == "https://api.pomogit.example" &&
      length(aws_apigatewayv2_route.api) == 1 &&
      length(aws_lambda_permission.api) == 1
    )
    error_message = "The API must use its own hostname, disable the default endpoint, and expose a route only when active."
  }

  assert {
    condition     = length(aws_cloudfront_distribution.site.custom_error_response) == 0
    error_message = "API authentication and not-found errors must never turn into a 200 SPA page."
  }

  assert {
    condition = (
      aws_s3_bucket_public_access_block.site.block_public_acls &&
      aws_s3_bucket_public_access_block.site.block_public_policy &&
      !aws_s3_bucket.site.force_destroy
    )
    error_message = "The frontend bucket must stay private and resist accidental data deletion."
  }

  assert {
    condition = (
      aws_lambda_function.api.environment[0].variables.DATABASE_SSL == "true" &&
      aws_lambda_function.api.environment[0].variables.DEV_BYPASS_AUTH == "false"
    )
    error_message = "Production must verify remote PostgreSQL TLS and require real authentication."
  }
}

run "paused_showcase" {
  command = plan
  variables {
    site_paused = true
  }
  assert {
    condition = (
      length(aws_apigatewayv2_route.api) == 0 &&
      length(aws_lambda_permission.api) == 0 &&
      aws_apigatewayv2_api.api.disable_execute_api_endpoint &&
      aws_cloudfront_function.spa.code == file("maintenance.js") &&
      !aws_s3_bucket.site.force_destroy &&
      aws_cloudfront_distribution.site.enabled
    )
    error_message = "Pausing must replace the frontend, remove public Lambda access and retain infrastructure and saved assets."
  }
}
