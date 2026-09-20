import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// One client per process — constructing per request leaks sockets.
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL,
});

export const docClient = DynamoDBDocumentClient.from(client);

export const STATE_TABLE = process.env.STATE_TABLE
export const HISTORY_TABLE = process.env.HISTORY_TABLE
