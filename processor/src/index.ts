import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.VESSEL_STATE_TABLE!;

const HISTORY_TABLE = process.env.VESSEL_HISTORY_TABLE!;
const NINETY_DAYS = 90 * 24 * 60 * 60;

type KinesisEvent = {
  Records: { kinesis: { data: string; sequenceNumber: string } }[];
};

export const handler = async (event: KinesisEvent) => {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    const vessel = JSON.parse(
      Buffer.from(record.kinesis.data, "base64").toString("utf8")
    );

    // Latest position per vessel — newer timestamp wins.
    // Remark:
    // attribute_not_exists — DynamoDB's built-in function. Fixed name, can't change it.
    // "mmsi" the hash of the database
    try {
      await client.send(
        new PutCommand({
          TableName: TABLE,
          Item: vessel,
          ConditionExpression: "attribute_not_exists(mmsi) OR #ts < :ts",
          ExpressionAttributeNames: { "#ts": "timestamp" },
          ExpressionAttributeValues: { ":ts": vessel.timestamp },
        })
      );
    } catch (err: any) {
      if (err.name !== "ConditionalCheckFailedException") {
        failures.push({ itemIdentifier: record.kinesis.sequenceNumber });
      }
    }

    // Hourly track — first position of each hour wins, the rest are rejected.
    // Independent of the write above: either may be accepted without the other.
    const hourBucket = vessel.timestamp.slice(0, 13); // "2026-09-19T08"

    try {
      await client.send(
        new PutCommand({
          TableName: HISTORY_TABLE,
          Item: {
            ...vessel,
            hourBucket,
            expiresAt: Math.floor(Date.now() / 1000) + NINETY_DAYS,
          },
          ConditionExpression: "attribute_not_exists(hourBucket)",
        })
      );
    } catch (err: any) {
      if (err.name !== "ConditionalCheckFailedException") {
        failures.push({ itemIdentifier: record.kinesis.sequenceNumber });
      }
    }
  }

  return { batchItemFailures: failures };
};
