output "kinesis_stream_name" {
  description = "Name of the Kinesis data stream"
  value       = aws_kinesis_stream.main.name
}

output "kinesis_stream_arn" {
  description = "ARN of the Kinesis data stream"
  value       = aws_kinesis_stream.main.arn
}

output "kinesis_stream_id" {
  description = "ID of the Kinesis data stream"
  value       = aws_kinesis_stream.main.id
}

#  Remark: No need to set them 1:1 to the variable.tf