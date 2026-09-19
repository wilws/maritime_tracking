variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "lambda_iam_role_arn" {
  description = "ARN of the IAM role the function assumes at runtime"
  type        = string
}

variable "lambda_filename" {
  description = "Path to the deployment zip; its hash triggers redeploys"
  type        = string
}

variable "lambda_environment_variables" {
  // This variable must be a map, where every value in the map is a string.
  description = "Environment variables passed to the function"
  type        = map(string)
  default     = {}
}

