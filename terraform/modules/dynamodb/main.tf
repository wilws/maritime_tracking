resource "aws_dynamodb_table" "this" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = var.dynamodb_hash_key
  range_key = var.dynamodb_range_key

  attribute {
    name = var.dynamodb_hash_key
    type = "S"
  }

  // Only emitted when a range key was given
  dynamic "attribute" {
    for_each = var.dynamodb_range_key == null ? [] : [var.dynamodb_range_key]
    content {
      name = attribute.value
      type = "S"
    }
  }

  stream_enabled   = var.dynamodb_stream_enabled
  stream_view_type = var.dynamodb_stream_enabled ? "NEW_AND_OLD_IMAGES" : null

  dynamic "ttl" {
    for_each = var.dynamodb_ttl_attribute == null ? [] : [var.dynamodb_ttl_attribute]
    content {
      attribute_name = ttl.value
      enabled        = true
    }
  }
}
