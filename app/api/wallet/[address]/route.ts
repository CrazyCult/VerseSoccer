import { getWalletAccounts } from "@/lib/soccerverse";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getWalletAccounts(address), {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return NextResponse.json({ error: "Could not resolve Soccerverse accounts for this wallet" }, { status: 502 });
  }
}
