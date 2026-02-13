import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ toUserId: z.string() });

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { toUserId } = parsed.data;

  if (toUserId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot send request to yourself" },
      { status: 400 }
    );
  }

  const existing = await prisma.friendRequest.findUnique({
    where: {
      fromUserId_toUserId: {
        fromUserId: session.user.id,
        toUserId,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Request already sent or exists" },
      { status: 400 }
    );
  }

  const friendRequest = await prisma.friendRequest.create({
    data: {
      fromUserId: session.user.id,
      toUserId,
      status: "PENDING",
    },
  });

  const fromUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });
  const displayName = fromUser?.name ?? fromUser?.email?.split("@")[0] ?? "Someone";

  await prisma.notification.create({
    data: {
      userId: toUserId,
      type: "FRIEND_REQUEST",
      data: {
        fromUserId: session.user.id,
        fromUserName: displayName,
        requestId: friendRequest.id,
      },
    },
  });

  return NextResponse.json({ success: true });
}
