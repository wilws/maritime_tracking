output "dynamodb_table_name" {
  value = aws_dynamodb_table.this.name
}

output "dynamodb_table_arn" {
  value = aws_dynamodb_table.this.arn
}

output "dynamodb_stream_arn" {
  value = aws_dynamodb_table.this.stream_arn
}
