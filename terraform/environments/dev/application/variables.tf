variable "iam_role_name" {
  description = "Name of the IAM role for the processor Lambda"
  type        = string
}

variable "iam_archiver_role_name" {
  description = "Name of the IAM role for the archiver Lambda"
  type        = string
}

variable "iam_broadcast_role_name" {
  description = "Name of the IAM role for the broadcast Lambda"
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

variable "lambda_broadcast_function_name" {
  description = "Name of the broadcast Lambda function"
  type        = string
}


variable "broadcast_endpoint" {
    description = "Next.js URL the broadcast Lambda POSTs vessel updates to"
  type        = string
}