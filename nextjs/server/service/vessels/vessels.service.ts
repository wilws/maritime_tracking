import { ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  docClient,
  STATE_TABLE,
  HISTORY_TABLE,
} from "@/server/repository/dynamo.client";
import type { Vessel, VesselHistory } from "@/types/vessel";

/**
 * Every vessel's latest known position.
 * A scan is fine at a few hundred rows; revisit if the fleet grows.
 */
export async function fetchAll(): Promise<Vessel[]> {
  const res = await docClient.send(new ScanCommand({ TableName: STATE_TABLE }));
  return (res.Items ?? []) as Vessel[];
}

/**
 * One vessel's hourly track, oldest first.
 * `days` back from now, capped by the table's 90-day TTL.
 */
export async function fetchHistory(
  mmsi: string,
  days = 30,
): Promise<VesselHistory[]> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  // hourBucket is an ISO string truncated to the hour, so it sorts lexically.
  const bucket = (d: Date) => d.toISOString().slice(0, 13);

  const res = await docClient.send(
    new QueryCommand({
      TableName: HISTORY_TABLE,
      KeyConditionExpression: "mmsi = :m AND hourBucket BETWEEN :from AND :to",
      ExpressionAttributeValues: {
        ":m": mmsi,
        ":from": bucket(from),
        ":to": bucket(to),
      },
    }),
  );

  return (res.Items ?? []) as VesselHistory[];
}
