import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Backfill requestId and fromUserName for FRIEND_REQUEST notifications
  const enriched = await Promise.all(
    notifications.map(async (n) => {
      if (n.type !== "FRIEND_REQUEST") return n;
      const data = n.data as Record<string, unknown>;
      const fromUserId = data?.fromUserId as string | undefined;
      if (!fromUserId) return n;

      let needsUpdate = false;
      const updates: Record<string, unknown> = {};

      if (!data?.requestId) {
        const pending = await prisma.friendRequest.findUnique({
          where: {
            fromUserId_toUserId: {
              fromUserId,
              toUserId: session.user!.id!,
            },
          },
        });
        if (pending && pending.status === "PENDING") {
          updates.requestId = pending.id;
          needsUpdate = true;
        }
      }

      if (!data?.fromUserName) {
        const fromUser = await prisma.user.findUnique({
          where: { id: fromUserId },
          select: { name: true, email: true },
        });
        updates.fromUserName = fromUser?.name ?? fromUser?.email?.split("@")[0] ?? "Someone";
        needsUpdate = true;
      }

      if (!needsUpdate) return n;
      return { ...n, data: { ...data, ...updates } };
    })
  );

  return NextResponse.json(enriched);
}
