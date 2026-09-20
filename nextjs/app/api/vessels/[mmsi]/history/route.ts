import { fetchHistory } from "@/server/service/vessels/vessels.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ mmsi: string }> },
) {
  const { mmsi } = await params;
  const days = Number(new URL(req.url).searchParams.get("days")) || 30;

  const history = await fetchHistory(mmsi, days);
  return Response.json({ history });
}
