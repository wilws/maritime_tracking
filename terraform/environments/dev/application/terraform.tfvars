

iam_role_name        = "maritime-dev-lambda-role"
iam_archiver_role_name = "maritime-dev-archiver-role"
iam_broadcast_role_name = "maritime-dev-broadcast-role"

lambda_function_name = "maritime-dev-vessel-processor"
lambda_archiver_function_name = "maritime-dev-vessel-archiver"
lambda_broadcast_function_name = "maritime-dev-vessel-broadcast"

broadcast_endpoint = "http://host.docker.internal:3901/api/vessels/live"
