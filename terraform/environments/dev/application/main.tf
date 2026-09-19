data "terraform_remote_state" "data" {
  backend = "local"
  config = {
    path = "../data/terraform.tfstate"
  }
}


/* We separate the perimissions for 2 lambdas : - 
1 - Processor and 
2 - Archiver

Processor is to take data from kinesis -> DyanmoDB
Archiver is to take data form kinesis -> S3
*/
data "aws_iam_policy_document" "processor_permissions" {
  statement {
    effect = "Allow"
    actions = [
      "kinesis:GetRecords",
      "kinesis:GetShardIterator",
      "kinesis:DescribeStream",
      "kinesis:ListStreams",
      "kinesis:ListShards",
    ]
    resources = [data.terraform_remote_state.data.outputs.kinesis_stream_arn]
  }
    statement {
    effect  = "Allow"
    actions = ["dynamodb:PutItem", "dynamodb:UpdateItem"]
    resources = [
      data.terraform_remote_state.data.outputs.dynamodb_table_arn,
      data.terraform_remote_state.data.outputs.dynamodb_history_table_arn,
    ]
  }
}

data "aws_iam_policy_document" "archiver_permissions" {
  statement {
    effect = "Allow"
    actions = [
      "kinesis:GetRecords",
      "kinesis:GetShardIterator",
      "kinesis:DescribeStream",
      "kinesis:ListStreams",
      "kinesis:ListShards",
    ]
    resources = [data.terraform_remote_state.data.outputs.kinesis_stream_arn]
  }

  statement {
    effect    = "Allow"
    actions   = ["s3:PutObject"]
    resources = ["${data.terraform_remote_state.data.outputs.s3_bucket_arn}/*"]
  }
}

data "aws_iam_policy_document" "broadcast_permissions" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:DescribeStream",
      "dynamodb:ListStreams",
    ]
    resources = [data.terraform_remote_state.data.outputs.dynamodb_stream_arn]
  }
}

module "iam_broadcast" {
  source                = "../../../modules/iam"
  iam_role_name         = var.iam_broadcast_role_name
  iam_extra_policy_json = data.aws_iam_policy_document.broadcast_permissions.json
}




module "iam_processor" {
  source             = "../../../modules/iam"
  iam_role_name      = var.iam_role_name
  iam_extra_policy_json = data.aws_iam_policy_document.processor_permissions.json
}

module "iam_archiver" {
  source                = "../../../modules/iam"
  iam_role_name         = var.iam_archiver_role_name
  iam_extra_policy_json = data.aws_iam_policy_document.archiver_permissions.json
}




module "lambda_processor" {
  source               = "../../../modules/lambda"
  lambda_function_name = var.lambda_function_name
  lambda_iam_role_arn  = module.iam_processor.iam_role_arn
  lambda_filename      = "${path.module}/build/lambda.zip"

  lambda_environment_variables = {
    VESSEL_STATE_TABLE = data.terraform_remote_state.data.outputs.dynamodb_table_name
    VESSEL_HISTORY_TABLE = data.terraform_remote_state.data.outputs.dynamodb_history_table_name
  }
}

module "lambda_archiver" {
  source               = "../../../modules/lambda"
  lambda_function_name = var.lambda_archiver_function_name
  lambda_iam_role_arn  = module.iam_archiver.iam_role_arn
  lambda_filename      = "${path.module}/build/archiver.zip"

  lambda_environment_variables = {
    RAW_EVENT_BUCKET = data.terraform_remote_state.data.outputs.s3_bucket_name
  }
}

module "lambda_broadcast" {
    source = "../../../modules/lambda"
    lambda_function_name = var.lambda_broadcast_function_name
    lambda_iam_role_arn = module.iam_broadcast.iam_role_arn

    lambda_filename  = "${path.module}/build/broadcast.zip"

    lambda_environment_variables = {
        BROADCAST_ENDPOINT = var.broadcast_endpoint
    }
}

resource "aws_lambda_event_source_mapping" "kinesis_archiver" {
  event_source_arn  = data.terraform_remote_state.data.outputs.kinesis_stream_arn
  function_name     = module.lambda_archiver.lambda_function_arn
  starting_position = "TRIM_HORIZON"

  batch_size                     = 10
  bisect_batch_on_function_error = true
  maximum_retry_attempts         = 3
}

resource "aws_lambda_event_source_mapping" "kinesis" {
  event_source_arn  = data.terraform_remote_state.data.outputs.kinesis_stream_arn
  function_name     = module.lambda_processor.lambda_function_arn
  starting_position = "TRIM_HORIZON"

  batch_size                     = 10
  bisect_batch_on_function_error = true
  maximum_retry_attempts         = 3
}

resource "aws_lambda_event_source_mapping" "dynamodb_broadcast" {
    event_source_arn = data.terraform_remote_state.data.outputs.dynamodb_stream_arn
    function_name = module.lambda_broadcast.lambda_function_name
    starting_position = "LATEST"

  batch_size = 10

}