import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || typeof url !== "string") {
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return Response.json({ error: "Only http and https URLs are allowed" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.href, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return Response.json(
        { error: `Failed to fetch: ${res.status} ${res.statusText}` },
        { status: 502 }
      );
    }

    const html = await res.text();
    return Response.json({ html });
  } catch (err: any) {
    console.error("fetch-html error:", err);
    return Response.json(
      { error: err?.message || "Failed to fetch the page" },
      { status: 502 }
    );
  }
}
