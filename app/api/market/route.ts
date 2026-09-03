import { fetchQubicMarket } from "@/lib/market/coin-gecko";

export const runtime = "nodejs";

export async function GET() {
  try {
    const market = await fetchQubicMarket();
    return Response.json(market, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return Response.json(
      { error: "Market data is unavailable." },
      {
        headers: { "Cache-Control": "no-store" },
        status: 503,
      },
    );
  }
}
