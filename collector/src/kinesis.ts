import { KinesisClient, PutRecordCommand } from "@aws-sdk/client-kinesis";
import type { VesselPosition } from "./types.js";

const region = process.env.AWS_REGION;
const endpoint = process.env.AWS_ENDPOINT_URL;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const streamName = process.env.KINESIS_STREAM_NAME;

if (!region || !endpoint || !accessKeyId || !secretAccessKey || !streamName) {
  throw new Error("Missing AWS/Kinesis environment variables");
}

const kinesis = new KinesisClient({
  region,
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

/** Counters so we can report throughput without logging every single record. */
export const kinesisStats = { sent: 0, failed: 0 };


export async function sendToKinesis(vessel: VesselPosition): Promise<void> {
  try {
    await kinesis.send(
      new PutRecordCommand({
        StreamName: streamName,
        Data: Buffer.from(JSON.stringify(vessel)),
        PartitionKey: vessel.mmsi,
      }),
    );
    kinesisStats.sent += 1;
  } catch (error) {
    kinesisStats.failed += 1;
    console.error(
      `Kinesis put failed for ${vessel.mmsi}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
