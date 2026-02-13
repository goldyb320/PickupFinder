import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ids = request.nextUrl.searchParams.get("ids");
  if (!ids) {
    return NextResponse.json({ status: {} });
  }

  const userIds = ids.split(",").filter(Boolean);
  if (userIds.length === 0) {
    return NextResponse.json({ status: {} });
  }

  const [accepted, pendingFromMe] = await Promise.all([
    prisma.friendRequest.findMany({
      where: {
        OR: [
          {
            fromUserId: session.user.id,
            toUserId: { in: userIds },
            status: "ACCEPTED",
          },
          {
            fromUserId: { in: userIds },
            toUserId: session.user.id,
            status: "ACCEPTED",
          },
        ],
      },
      select: { fromUserId: true, toUserId: true },
    }),
    prisma.friendRequest.findMany({
      where: {
        fromUserId: session.user.id,
        toUserId: { in: userIds },
        status: "PENDING",
      },
      select: { toUserId: true },
    }),
  ]);

  const friendIds = new Set<string>();
  for (const r of accepted) {
    const other = r.fromUserId === session.user!.id! ? r.toUserId : r.fromUserId;
    friendIds.add(other);
  }
  const pendingIds = new Set(pendingFromMe.map((r) => r.toUserId));

  const status: Record<string, { isFriend: boolean; requestPending: boolean }> = {};
  for (const id of userIds) {
    if (id === session.user.id) continue;
    status[id] = {
      isFriend: friendIds.has(id),
      requestPending: pendingIds.has(id),
    };
  }

  return NextResponse.json({ status });
}
