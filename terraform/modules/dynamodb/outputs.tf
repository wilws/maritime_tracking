output "dynamodb_table_name" {
  value = aws_dynamodb_table.vessel_state.name
}

output "dynamodb_table_arn" {
  value = aws_dynamodb_table.vessel_state.arn
}

output "dynamodb_stream_arn" {
  value = aws_dynamodb_table.vessel_state.stream_arn
}