variable "iam_role_name" {
  description = "Name of the IAM role created for the Lambda function"
  type        = string
}

variable "iam_extra_policy_json" {
  description = "Rendered IAM policy JSON granting this role its specific permissions"
  type        = string
}