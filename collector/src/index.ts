// Must come first: loads .env before any other module reads process.env.
import "./config.js";

import WebSocket from "ws";

import { normalise, navStatusLabel, HEADING_UNKNOWN } from "./normalise.js";
import type { AisStreamMessage } from "./types.js";
import { sendToKinesis, kinesisStats } from "./kinesis.js";

const WS_ENDPOINT = "wss://stream.aisstream.io/v0/stream";

const apiKey = process.env.AISSTREAM_API_KEY;
const bbox = {
  swLat: Number(process.env.AIS_BBOX_SW_LAT),
  swLon: Number(process.env.AIS_BBOX_SW_LON),
  neLat: Number(process.env.AIS_BBOX_NE_LAT),
  neLon: Number(process.env.AIS_BBOX_NE_LON),
};

if (!apiKey) {
  console.error("AISSTREAM_API_KEY is not set. Check the project-root .env.");
  process.exit(1);
}
if (Object.values(bbox).some(Number.isNaN)) {
  console.error("Bounding box is incomplete or non-numeric:", bbox);
  process.exit(1);
}

let reconnectAttempt = 0;

function connect(): void {
  const socket = new WebSocket(WS_ENDPOINT);

  socket.on("open", () => {
    reconnectAttempt = 0;
    console.log("Connected. Subscribing to", bbox);
    socket.send(
      JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: [[[bbox.swLat, bbox.swLon], [bbox.neLat, bbox.neLon]]],
        FilterMessageTypes: ["PositionReport"],
      }),
    );
  });

  socket.on("message", (data: WebSocket.RawData) => {
    let raw: AisStreamMessage;
    try {
      raw = JSON.parse(data.toString()) as AisStreamMessage;
    } catch {
      // A malformed frame must not kill a process meant to run for weeks.
      return;
    }

    const vessel = normalise(raw);
    if (!vessel) return;

    // Send the normalised event, not AISStream's shape — downstream consumers
    // speak our contract and should never see Sog/Cog/padded names.
    // sendToKinesis handles its own errors so one failure cannot stop the feed.
    void sendToKinesis(vessel);

    const heading = vessel.heading === HEADING_UNKNOWN ? "  --" : `${vessel.heading.toString().padStart(3)}°`;
    console.log(
      `${vessel.shipName.padEnd(20)} ${vessel.mmsi.padEnd(10)} ` +
        `${vessel.latitude.toFixed(4).padStart(9)}, ${vessel.longitude.toFixed(4).padStart(9)}  ` +
        `${vessel.speed.toFixed(1).padStart(5)}kn  ${vessel.course.toFixed(1).padStart(5)}°  ` +
        `${heading}  ${navStatusLabel(vessel.navigationStatus)}`,
    );
  });

  socket.on("error", (error) => {
    console.error("WebSocket error:", error.message);
  });

  socket.on("close", (code, reason) => {
    
    const delay = Math.min(1000 * 2 ** reconnectAttempt, 30000);
    const jittered = delay * (0.5 + Math.random() * 0.5);
    reconnectAttempt += 1;

    console.warn(
      `Closed (${code}${reason.length ? `: ${reason.toString()}` : ""}). ` +
        `Reconnecting in ${(jittered / 1000).toFixed(1)}s`,
    );
    setTimeout(connect, jittered);
  });
}

// Periodic Kinesis tally — enough to see the pipeline working without
// drowning the vessel rows in one log line per record.
setInterval(() => {
  console.log(`── kinesis: ${kinesisStats.sent} sent, ${kinesisStats.failed} failed ──`);
}, 10_000);

connect();
