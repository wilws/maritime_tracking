module "kinesis" {
  source                   = "../../../modules/kinesis"
  kinesis_stream_name      = var.kinesis_stream_name
  kinesis_shard_count      = var.kinesis_shard_count
  kinesis_retention_period = var.kinesis_retention_period
  kinesis_stream_mode      = var.kinesis_stream_mode
}

module "dynamodb_state" {
  source                  = "../../../modules/dynamodb"
  dynamodb_table_name     = var.dynamodb_table_name
  dynamodb_hash_key       = "mmsi"
  dynamodb_stream_enabled = true
}

module "dynamodb_history" {
  source                 = "../../../modules/dynamodb"
  dynamodb_table_name    = var.dynamodb_history_table_name
  dynamodb_hash_key      = "mmsi"
  dynamodb_range_key     = "hourBucket"
  dynamodb_ttl_attribute = "expiresAt"
}


module "s3" {
  source = "../../../modules/s3"
  s3_bucket_name = var.s3_bucket_name
}