variable "kinesis_stream_name" {
    description = "Name of the Kinesis stream"
    type = string
}

variable "kinesis_stream_mode" {
    description = "Capacity mode for the Kinesis stream"
    type = string
    default = "ON_DEMAND"

    validation {
        condition     = contains(["ON_DEMAND", "PROVISIONED"], var.kinesis_stream_mode)
        error_message = "kinesis_stream_mode must be ON_DEMAND or PROVISIONED."
    }
}

// More shards = more pipes for data to flow through.
// and cost more
variable "kinesis_shard_count" {
    description = "Number of shards when using PROVISIONED mode"
    type        = number
    default     = 1
}

variable "kinesis_retention_period" {
  description = "Retention period in hours"
  type        = number
  default     = 24
}