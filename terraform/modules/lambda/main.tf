resource "aws_lambda_function" "this" {
  function_name = var.lambda_function_name
  role          = var.lambda_iam_role_arn

  runtime = "nodejs20.x"
  handler = "index.handler"

  filename         = var.lambda_filename
  source_code_hash = filebase64sha256(var.lambda_filename)

  timeout     = 30
  memory_size = 256

  environment {
    variables = var.lambda_environment_variables
  }
}