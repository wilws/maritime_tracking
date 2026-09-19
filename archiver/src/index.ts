import {S3Client, PutObjectCommand} from "@aws-sdk/client-s3"

const s3 = new S3Client({})
const BUCKET = process.env.RAW_EVENT_BUCKET!;


type KinesisEvent = {
  Records: { 
    kinesis: { 
        data: string; 
        sequenceNumber: string ;
        partitionKey: string;
        approximateArrivalTimestamp: number;
    } }[];
};

export const handler = async (event: KinesisEvent) => {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {

    const body = Buffer.from(record.kinesis.data, "base64").toString("utf8");
    const arrived = new Date(record.kinesis.approximateArrivalTimestamp * 1000);

    const key = [
      `year=${arrived.getUTCFullYear()}`,
      `month=${String(arrived.getUTCMonth() + 1).padStart(2, "0")}`,
      `day=${String(arrived.getUTCDate()).padStart(2, "0")}`,
      `hour=${String(arrived.getUTCHours()).padStart(2, "0")}`,
      `${record.kinesis.sequenceNumber}.json`,
    ].join("/");
   

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: body,
          ContentType: "application/json",
        })
      );
    } catch {
      failures.push({ itemIdentifier: record.kinesis.sequenceNumber });
    }
  }

  return { batchItemFailures: failures };
};
