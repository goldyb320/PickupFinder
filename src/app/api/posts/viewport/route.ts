import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const north = parseFloat(searchParams.get("north") ?? "0");
  const south = parseFloat(searchParams.get("south") ?? "0");
  const east = parseFloat(searchParams.get("east") ?? "0");
  const west = parseFloat(searchParams.get("west") ?? "0");

  if (
    Number.isNaN(north) ||
    Number.isNaN(south) ||
    Number.isNaN(east) ||
    Number.isNaN(west)
  ) {
    return NextResponse.json(
      { error: "Invalid viewport: north, south, east, west required" },
      { status: 400 }
    );
  }

  const now = new Date();
  const sport = searchParams.get("sport");
  const timeWindow = searchParams.get("timeWindow");
  const needsPlayersOnly = searchParams.get("needsPlayersOnly") === "true";

  let timeFilter = Prisma.empty;
  if (timeWindow === "2h") {
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    timeFilter = Prisma.sql`AND p."startTime" <= ${in2h} AND p."startTime" >= ${now}`;
  } else if (timeWindow === "today") {
    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);
    timeFilter = Prisma.sql`AND p."startTime" <= ${endOfDay} AND p."startTime" >= ${now}`;
  } else if (timeWindow === "weekend") {
    const day = now.getUTCDay();
    const daysToSaturday = day === 0 ? 6 : 6 - day;
    const saturday = new Date(now);
    saturday.setUTCDate(saturday.getUTCDate() + daysToSaturday);
    saturday.setUTCHours(0, 0, 0, 0);
    const sunday = new Date(saturday);
    sunday.setUTCDate(sunday.getUTCDate() + 1);
    sunday.setUTCHours(23, 59, 59, 999);
    timeFilter = Prisma.sql`AND p."startTime" >= ${saturday} AND p."startTime" <= ${sunday}`;
  }

  const sportFilter = sport ? Prisma.sql`AND p.sport::text = ${sport}` : Prisma.empty;
  const needsPlayersFilter = needsPlayersOnly
    ? Prisma.sql`AND (SELECT COUNT(*) FROM "PostParticipant" pp WHERE pp."postId" = p.id) < p."totalPlayers"`
    : Prisma.empty;

  const posts = await prisma.$queryRaw<
    Array<{
      id: string;
      creatorId: string;
      locationId: string;
      sport: string;
      title: string;
      description: string | null;
      skillLevel: string;
      visibility: string;
      startTime: Date;
      durationMinutes: number;
      totalPlayers: number;
      status: string;
      expiresAt: Date;
      locationLabel: string;
      lat: number;
      lng: number;
      joinedCount: bigint;
    }>
  >(Prisma.sql`
    SELECT
      p.id,
      p."creatorId",
      p."locationId",
      p.sport,
      p.title,
      p.description,
      p."skillLevel",
      p.visibility,
      p."startTime",
      p."durationMinutes",
      p."totalPlayers",
      p.status,
      p."expiresAt",
      l.label AS "locationLabel",
      l.lat,
      l.lng,
      (SELECT COUNT(*) FROM "PostParticipant" pp WHERE pp."postId" = p.id)::bigint AS "joinedCount"
    FROM "Post" p
    JOIN "Location" l ON p."locationId" = l.id
    WHERE p.status NOT IN ('CANCELLED', 'EXPIRED')
      AND p."expiresAt" > ${now}
      ${timeFilter}
      ${sportFilter}
      ${needsPlayersFilter}
      AND l.lat BETWEEN ${Math.min(south, north)} AND ${Math.max(south, north)}
      AND l.lng BETWEEN ${Math.min(west, east)} AND ${Math.max(west, east)}
    ORDER BY p."startTime" ASC
  `);

  return NextResponse.json(
    posts.map((p) => ({
      ...p,
      joinedCount: Number(p.joinedCount),
      startTime: p.startTime.toISOString(),
      expiresAt: p.expiresAt.toISOString(),
    }))
  );
}
