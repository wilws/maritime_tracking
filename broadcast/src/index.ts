const ENDPOINT = process.env.BROADCAST_ENDPOINT!;

type StreamEvent = {
  Records: {
    eventName: string;
    dynamodb: { NewImage?: Record<string, any> };
  }[];
};

// DynamoDB Streams hand back attribute-typed values ({"S": "..."}), not plain JSON
const plain = (image: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(image).map(([k, v]: [string, any]) => [
      k,
      "S" in v ? v.S : "N" in v ? Number(v.N) : v,
    ])
  );

export const handler = async (event: StreamEvent) => {
  const vessels = event.Records
    .filter((r) => r.eventName !== "REMOVE" && r.dynamodb.NewImage)
    .map((r) => plain(r.dynamodb.NewImage!));

  if (vessels.length === 0) return;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vessels }),
    });
    console.log(`posted ${vessels.length} vessels → ${res.status}`);
  } catch (err) {
    console.error("broadcast failed:", err);
  }
};
