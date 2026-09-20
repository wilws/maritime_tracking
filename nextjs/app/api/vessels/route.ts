import { fetchAll } from "@/server/service/vessels/vessels.service";

// Initial map paint — the WebSocket only carries changes from here on.
export async function GET() {
  const vessels = await fetchAll();
  return Response.json({ vessels });
}
