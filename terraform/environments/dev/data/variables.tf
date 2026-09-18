variable "kinesis_stream_name" {
  description = "Name of the Kinesis stream carrying raw AIS vessel events"
  type        = string
}

variable "kinesis_stream_mode" {
  description = "Capacity mode for the Kinesis stream"
  type        = string
}

variable "kinesis_retention_period" {
  description = "Retention period in hours"
  type        = number
}

variable "kinesis_shard_count" {
  description = "Number of shards when using PROVISIONED mode"
  type        = number
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table holding latest vessel state"
  type        = string
}
