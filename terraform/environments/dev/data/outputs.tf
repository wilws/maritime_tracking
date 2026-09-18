

output "kinesis_stream_arn" {
  value = module.kinesis.kinesis_stream_arn
}


output "kinesis_stream_name" {
  value = module.kinesis.kinesis_stream_name
}


output "dynamodb_table_name" {
  value = module.dynamodb.dynamodb_table_name
}

output "dynamodb_table_arn" {
  value = module.dynamodb.dynamodb_table_arn
}

output "dynamodb_stream_arn" {
  value = module.dynamodb.dynamodb_stream_arn
}