output "table_name" {
  value = aws_dynamodb_table.vessel_state.name
}

output "table_arn" {
  value = aws_dynamodb_table.vessel_state.arn
}

output "stream_arn" {
  value = aws_dynamodb_table.vessel_state.stream_arn
}