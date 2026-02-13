import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: friendId } = await params;

  const friendship = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { fromUserId: session.user.id, toUserId: friendId },
        { fromUserId: friendId, toUserId: session.user.id },
      ],
      status: "ACCEPTED",
    },
  });

  if (!friendship) {
    return NextResponse.json({ error: "Not friends with this user" }, { status: 404 });
  }

  const now = new Date();

  const games = await prisma.post.findMany({
    where: {
      creatorId: friendId,
      status: { in: ["OPEN", "FULL"] },
      expiresAt: { gt: now },
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

  return NextResponse.json(
    games.map((p) => ({
      id: p.id,
      title: p.title,
      sport: p.sport,
      startTime: p.startTime.toISOString(),
      durationMinutes: p.durationMinutes,
      totalPlayers: p.totalPlayers,
      joinedCount: p.participants.length,
      status: p.status,
      location: p.location,
      participants: p.participants,
    }))
  );
}
