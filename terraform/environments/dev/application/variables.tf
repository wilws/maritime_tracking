variable "iam_role_name" {
  description = "Name of the IAM role for the processor Lambda"
  type        = string
}

variable "iam_archiver_role_name" {
  description = "Name of the IAM role for the archiver Lambda"
  type        = string
}


variable "lambda_function_name" {
  description = "Name of the vessel processor Lambda function"
  type        = string
}


variable "lambda_archiver_function_name" {
  description = "Name of the archiver Lambda function"
  type        = string
}