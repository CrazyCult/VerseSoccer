import { getClubSnapshot } from "@/lib/soccerverse";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const id = Number.parseInt(clubId, 10);

  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid club id" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getClubSnapshot(id), {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "Club data is temporarily unavailable" }, { status: 502 });
  }
}
