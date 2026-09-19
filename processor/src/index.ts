import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.VESSEL_STATE_TABLE!;

type KinesisEvent = {
  Records: { kinesis: { data: string; sequenceNumber: string } }[];
};

export const handler = async (event: KinesisEvent) => {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    const vessel = JSON.parse(
      Buffer.from(record.kinesis.data, "base64").toString("utf8")
    );

    try {
      await client.send(
        new PutCommand({
          TableName: TABLE,
          Item: vessel,
          ConditionExpression:
            "attribute_not_exists(mmsi) OR #ts < :ts",
          ExpressionAttributeNames: { "#ts": "timestamp" },
          ExpressionAttributeValues: { ":ts": vessel.timestamp },
        })
      );
    } catch (err: any) {
      if (err.name === "ConditionalCheckFailedException") continue;
      failures.push({ itemIdentifier: record.kinesis.sequenceNumber });
    }
  }

  return { batchItemFailures: failures };
};
