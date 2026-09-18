resource "aws_dynamodb_table" "vessel_state" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "mmsi"

  attribute {
    name = "mmsi"
    type = "S"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

}