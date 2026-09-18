data "terraform_remote_state" "data" {
  backend = "local"
  config = {
    path = "../data/terraform.tfstate"
  }
}

module "iam" {
  source             = "../../../modules/iam"
  iam_role_name      = var.iam_role_name
  kinesis_stream_arn = data.terraform_remote_state.data.outputs.kinesis_stream_arn
  dynamodb_table_arn = data.terraform_remote_state.data.outputs.dynamodb_table_arn
}

module "lambda_processor" {
  source               = "../../../modules/lambda"
  lambda_function_name = var.lambda_function_name
  lambda_iam_role_arn  = module.iam.iam_role_arn
  lambda_filename      = "${path.module}/build/lambda.zip"

  lambda_environment_variables = {
    VESSEL_STATE_TABLE = data.terraform_remote_state.data.outputs.dynamodb_table_name
  }
}

resource "aws_lambda_event_source_mapping" "kinesis" {
  event_source_arn  = data.terraform_remote_state.data.outputs.kinesis_stream_arn
  function_name     = module.lambda_processor.lambda_function_arn
  starting_position = "TRIM_HORIZON"

  batch_size                     = 10
  bisect_batch_on_function_error = true
  maximum_retry_attempts         = 3
}
