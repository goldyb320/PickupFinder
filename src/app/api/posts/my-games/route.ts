import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateFilter = searchParams.get("date") ?? "upcoming";
  const roleFilter = searchParams.get("role") ?? "all";
  const sport = searchParams.get("sport") ?? "";

  const now = new Date();

  const sportFilter = sport
    ? { sport: sport as "BASKETBALL" | "SOCCER" | "TENNIS" | "VOLLEYBALL" | "PICKLEBALL" | "ULTIMATE" | "FLAG_FOOTBALL" | "OTHER" }
    : {};

  const hosted = await prisma.post.findMany({
    where: {
      creatorId: session.user.id,
      ...sportFilter,
    },
    include: {
      location: true,
      participants: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const asParticipant = await prisma.post.findMany({
    where: {
      participants: { some: { userId: session.user.id } },
      creatorId: { not: session.user.id },
      ...sportFilter,
    },
    include: {
      location: true,
      creator: { select: { id: true, name: true, image: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  let games: Array<{
    id: string;
    title: string;
    sport: string;
    startTime: string;
    durationMinutes: number;
    totalPlayers: number;
    joinedCount: number;
    status: string;
    location: { id: string; label: string; lat: number; lng: number };
    role: "hosting" | "participant";
    creator?: { id: string; name: string | null; image: string | null };
    participants: Array<{ user: { id: string; name: string | null; image: string | null } }>;
  }> = [];

  if (roleFilter === "all" || roleFilter === "hosting") {
    games = [
      ...games,
      ...hosted.map((p) => ({
        id: p.id,
        title: p.title,
        sport: p.sport,
        startTime: p.startTime.toISOString(),
        durationMinutes: p.durationMinutes,
        totalPlayers: p.totalPlayers,
        joinedCount: p.participants.length,
        status: p.status,
        location: p.location,
        role: "hosting" as const,
        participants: p.participants,
      })),
    ];
  }

  if (roleFilter === "all" || roleFilter === "participant") {
    games = [
      ...games,
      ...asParticipant.map((p) => ({
        id: p.id,
        title: p.title,
        sport: p.sport,
        startTime: p.startTime.toISOString(),
        durationMinutes: p.durationMinutes,
        totalPlayers: p.totalPlayers,
        joinedCount: p.participants.length,
        status: p.status,
        location: p.location,
        role: "participant" as const,
        creator: p.creator,
        participants: p.participants,
      })),
    ];
  }

  games.sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const applyDateFilter = (
    list: typeof games
  ): typeof games => {
    if (dateFilter === "all") return list;

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return list.filter((g) => {
      const start = new Date(g.startTime);
      if (dateFilter === "upcoming") return start >= now;
      if (dateFilter === "past") return start < now;
      if (dateFilter === "today")
        return start >= todayStart && start < todayEnd;
      if (dateFilter === "week") return start >= todayStart && start < weekEnd;
      return true;
    });
  };

  const filtered = applyDateFilter(games);

  return NextResponse.json(filtered);
}
