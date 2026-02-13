import { NextRequest, NextResponse } from "next/server";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  if (!MAPBOX_TOKEN) {
    return NextResponse.json(
      { error: "Mapbox token not configured" },
      { status: 500 }
    );
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&types=poi,place,address`;

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Geocoding failed" },
      { status: res.status }
    );
  }

  const data = await res.json();
  const features = (data.features ?? []).map((f: { place_name: string; center: number[] }) => ({
    placeName: f.place_name,
    lng: f.center[0],
    lat: f.center[1],
  }));

  return NextResponse.json(features);
}
