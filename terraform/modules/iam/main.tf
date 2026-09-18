/*
 * aws_iam_policy_document is a data source, not a resource
 * data : obtain/construct information for use elsewhere
 */


// this is the permission policy
// we can later refer it as data.aws_iam_policy_document.lambda_permissions.json
data "aws_iam_policy_document" "lambda_permissions" {
  statement {
    effect = "Allow"
    actions = [
      "kinesis:GetRecords",
      "kinesis:GetShardIterator",
      "kinesis:DescribeStream",
      "kinesis:ListStreams",
      "kinesis:ListShards"
    ]
    resources = [
      var.kinesis_stream_arn
    ]
  }


  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
    ]
    resources = [
      var.dynamodb_table_arn
    ]
  }


  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    // services produce logs, those logs are stored as log groups, and a log group is a resource owned by CloudWatch Logs.
    resources = ["*"]
  }


}


# Question                          Answer
# ─────────────────────────────────────────────────────────
# What log groups exist?            /aws/lambda/x, /aws/rds/y, ...
#                                   (true regardless of your policy)

# Which may THIS role touch?        ← this is what resources answers
#   resources = ["*"]               all of them
#   resources = ["arn:...:/aws/lambda/maritime-processor"]   just that one


// this is the trust policy
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}


resource "aws_iam_role" "lambda" {
  name               = var.iam_role_name
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}


resource "aws_iam_role_policy" "lambda" {
  name   = "lambda-permissions"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_permissions.json
}