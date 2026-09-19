/*
 * aws_iam_policy_document is a data source, not a resource
 * data : obtain/construct information for use elsewhere
 */


// -----  this is the trust policy ----- //
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


// ----- this is the permission policy ----- //

// Share this write log perimission to all lambda
data "aws_iam_policy_document" "lambda_logs" {
  statement {
    effect =  "Allow"
    actions = [       
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents" 
    ]
    resources = ["*"]
  }
}



// we can later refer it as data.aws_iam_policy_document.lambda_permissions.json
data "aws_iam_policy_document" "lambda_permissions" {

  source_policy_documents = [
    data.aws_iam_policy_document.lambda_logs.json,
    var.iam_extra_policy_json
  ]


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