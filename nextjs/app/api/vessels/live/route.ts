import { publish } from "@/server/realtime";
import type { Vessel } from "@/types/vessel";

/**
 * Receives batches from the broadcast Lambda and fans them out
 * to every connected browser.
 */
export async function POST(req: Request) {
  const secret = process.env.BROADCAST_SECRET;
  if (secret && req.headers.get("x-broadcast-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const { vessels } = (await req.json()) as { vessels: Vessel[] };

  if (!Array.isArray(vessels) || vessels.length === 0) {
    return Response.json({ published: 0 });
  }

  publish(vessels);
  return Response.json({ published: vessels.length });
}
