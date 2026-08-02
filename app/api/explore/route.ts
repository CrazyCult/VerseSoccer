import { NextRequest, NextResponse } from "next/server";

const api = "https://services.soccerverse.com/api";
const sources: Record<string, string> = {
  marketPlayers: "/players/detailed?per_page=20&sort_by=rating&sort_order=desc",
  marketClubs: "/clubs/detailed?per_page=20&sort_by=volume_7_day&sort_order=desc",
};

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source") ?? "";
  const path = sources[source];
  if (!path) return NextResponse.json({ error: "Unsupported data source" }, { status: 400 });
  const response = await fetch(`${api}${path}`, { next: { revalidate: 60 }, headers: { Accept: "application/json" } });
  if (!response.ok) return NextResponse.json({ error: "Soccerverse API unavailable" }, { status: response.status });
  const payload = await response.json() as { items?: unknown[] };
  return NextResponse.json(payload.items ?? []);
}
