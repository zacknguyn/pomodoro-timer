resource "aws_iam_role" "api" {
  name = "${local.name_prefix}-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRole"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each          = toset(["api", "migrate"])
  name              = "/aws/lambda/${local.name_prefix}-${each.key}"
  retention_in_days = 7
}

resource "aws_iam_role_policy" "logs" {
  role = aws_iam_role.api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = [for group in aws_cloudwatch_log_group.lambda : "${group.arn}:*"]
      }
    ]
  })
}

locals {
  common_environment = {
    NODE_ENV         = "production"
    FRONTEND_URL     = "https://${var.domain_name}"
    API_URL          = "https://api.${var.domain_name}"
    DATABASE_SSL     = "true"
    DATABASE_CA_CERT = var.database_ca_cert
    DEV_BYPASS_AUTH  = "false"
  }

  api_environment = merge(local.common_environment, {
    DATABASE_URL         = var.database_url
    BETTER_AUTH_SECRET   = var.better_auth_secret
    GITHUB_CLIENT_ID     = var.github_client_id
    GITHUB_CLIENT_SECRET = var.github_client_secret
    GITHUB_CALLBACK_URL  = var.github_client_id != "" ? "https://api.${var.domain_name}/api/auth/github/callback" : ""
  })

  migration_environment = merge(local.common_environment, {
    DATABASE_URL          = var.migration_database_url
    RUNTIME_DATABASE_ROLE = "pomogit_runtime"
  })
}

resource "aws_lambda_function" "api" {
  function_name    = "${local.name_prefix}-api"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs24.x"
  architectures    = ["x86_64"]
  handler          = "src/lambdas/app.handler"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 30
  memory_size      = 512
  publish          = true

  environment {
    variables = local.api_environment
  }

  depends_on = [aws_iam_role_policy.logs]
}

resource "aws_lambda_alias" "api" {
  name             = "live"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version
}

# No VPC, NAT, RDS, proxy, provisioned concurrency or scheduled warm-up.
# The migration function is IAM-only; no public API route invokes it.
resource "aws_lambda_function" "migrate" {
  function_name    = "${local.name_prefix}-migrate"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs24.x"
  architectures    = ["x86_64"]
  handler          = "src/lambdas/migrate.handler"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 120
  memory_size      = 512

  environment {
    variables = local.migration_environment
  }

  depends_on = [aws_iam_role_policy.logs]
}

resource "aws_apigatewayv2_api" "api" {
  name                         = "${local.name_prefix}-api"
  protocol_type                = "HTTP"
  disable_execute_api_endpoint = true
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_alias.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "api" {
  count     = var.site_paused ? 0 : 1
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_apigatewayv2_stage" "api" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
  }
}

resource "aws_lambda_permission" "api" {
  count         = var.site_paused ? 0 : 1
  statement_id  = "ApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  qualifier     = aws_lambda_alias.api.name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_budgets_budget" "showcase" {
  name         = "${local.name_prefix}-monthly"
  budget_type  = "COST"
  limit_amount = "10"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  dynamic "notification" {
    for_each = toset([50, 100])

    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_email]
    }
  }
}
