

output "kinesis_stream_arn" {
  value = module.kinesis.kinesis_stream_arn
}


output "kinesis_stream_name" {
  value = module.kinesis.kinesis_stream_name
}


output "dynamodb_table_name" {
  value = module.dynamodb_state.dynamodb_table_name
}

output "dynamodb_table_arn" {
  value = module.dynamodb_state.dynamodb_table_arn
}

output "dynamodb_history_table_name" {
  value = module.dynamodb_history.dynamodb_table_name
}

output "dynamodb_history_table_arn" {
  value = module.dynamodb_history.dynamodb_table_arn
}


output "dynamodb_stream_arn" {
  value = module.dynamodb_state.dynamodb_stream_arn
}

output "s3_bucket_name" {
  value = module.s3.s3_bucket_name
}

output "s3_bucket_arn" {
  value = module.s3.s3_bucket_arn
}
