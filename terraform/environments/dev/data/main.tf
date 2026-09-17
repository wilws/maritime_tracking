module "kinesis" {
    source = "../../../modules/kinesis"
    kinesis_stream_name = var.kinesis_stream_name
    kinesis_shard_count = var.kinesis_shard_count
    kinesis_retention_period = var.kinesis_retention_period
    kinesis_stream_mode = var.kinesis_stream_mode
}

module "dynamodb" {
    source = "../../../modules/dynamodb"
    dynamodb_table_name = var.dynamodb_table_name
}
