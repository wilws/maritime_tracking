type KinesisRecord = {
  kinesis: {
    data: string;
    sequenceNumber: string;
    partitionKey: string;
  };
};

type KinesisEvent = {
  Records: KinesisRecord[];
};

export const handler = async (event: KinesisEvent) => {
  console.log(`batch of ${event.Records.length} records`);

  for (const record of event.Records) {
    const payload = Buffer.from(record.kinesis.data, "base64").toString("utf8");
    console.log(`mmsi=${record.kinesis.partitionKey} ${payload}`);
  }

  return { batchItemFailures: [] };
};
 