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
    include: {
      fromUser: { select: { id: true, name: true, email: true, image: true, profileImage: true, bio: true } },
      toUser: { select: { id: true, name: true, email: true, image: true, profileImage: true, bio: true } },
    },
  });

  if (!friendship) {
    return NextResponse.json({ error: "Not friends with this user" }, { status: 404 });
  }

  const friend =
    friendship.fromUserId === session.user.id
      ? friendship.toUser
      : friendship.fromUser;

  return NextResponse.json({
    ...friend,
    avatarUrl: friend.profileImage ?? friend.image ?? null,
  });
}

export async function DELETE(
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

  await prisma.friendRequest.delete({
    where: { id: friendship.id },
  });

  return NextResponse.json({ success: true });
}
