import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    providers: {
      tmdb: Boolean(process.env.TMDB_BEARER_TOKEN || process.env.TMDB_API_KEY),
      tvmaze: true
    }
  });
}
