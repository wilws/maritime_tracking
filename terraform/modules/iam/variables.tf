variable "kinesis_stream_arn" {
  description = "ARN of the Kinesis stream the role may read from"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table the role may write to"
  type        = string
}

variable "iam_role_name" {
  description = "Name of the IAM role created for the Lambda function"
  type        = string
}
