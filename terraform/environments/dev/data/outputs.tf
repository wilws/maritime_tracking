
# Lambda needs the stream ARN from here.
output "kinesis_stream_output" {
  value       = module.kinesis.kinesis_stream_arn
}
