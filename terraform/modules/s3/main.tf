resource "aws_s3_bucket" "this" {
  bucket = var.s3_bucket_name
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    id     = "expire-raw-events"
    status = "Enabled"

    filter {}

    expiration {
      days = var.s3_expiration_days
    }
  }
}