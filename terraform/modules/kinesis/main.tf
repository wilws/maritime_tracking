resource "aws_kinesis_stream" "main" {
    name = var.kinesis_stream_name
    retention_period = var.kinesis_retention_period

    stream_mode_details {
      stream_mode = var.kinesis_stream_mode
    }

    shard_count = var.kinesis_stream_mode == "PROVISIONED" ? var.kinesis_shard_count : null
}

# "main" is just a label for Terraform to refer to this resource
# "var.kinesis_stream_name" is the real name for the resource