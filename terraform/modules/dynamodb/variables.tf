variable "dynamodb_table_name" {
  description = "Name of the table"
  type        = string
}

variable "dynamodb_hash_key" {
  description = "Partition key attribute name"
  type        = string
}

variable "dynamodb_range_key" {
  description = "Sort key attribute name, or null for none"
  type        = string
  default     = null
}

variable "dynamodb_stream_enabled" {
  description = "Whether the table emits a DynamoDB Stream"
  type        = bool
  default     = false
}

variable "dynamodb_ttl_attribute" {
  description = "Attribute holding expiry timestamp, or null for no TTL"
  type        = string
  default     = null
}
