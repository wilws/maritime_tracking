variable "s3_bucket_name" {
  description = "Name of the bucket holding raw AIS events"
  type        = string
}

variable "s3_expiration_days" {
  description = "Days before raw event objects are deleted"
  type        = number
  default     = 365
}
