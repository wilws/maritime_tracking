variable "kinesis_stream_name" {
  type = string
}

variable "kinesis_stream_mode" {
  type = string
}

variable "kinesis_retention_period" {
  type = number
}

variable "kinesis_shard_count" {
    type = number
}


variable "dynamodb_table_name" {
   type = string
}