import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: postId } = await params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { participants: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.status !== "OPEN") {
    return NextResponse.json(
      { error: "Post is full or no longer accepting joins" },
      { status: 400 }
    );
  }

  if (post.participants.length >= post.totalPlayers) {
    await prisma.post.update({
      where: { id: postId },
      data: { status: "FULL" },
    });
    return NextResponse.json(
      { error: "Post is full" },
      { status: 400 }
    );
  }

  const existing = await prisma.postParticipant.findUnique({
    where: {
      postId_userId: { postId, userId: session.user.id },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Already joined" }, { status: 400 });
  }

  if (post.visibility === "INVITE_ONLY") {
    const invited = await prisma.postTag.findFirst({
      where: { postId, userId: session.user.id },
    });
    if (!invited) {
      return NextResponse.json(
        { error: "This game is invite-only. You must be invited to join." },
        { status: 403 }
      );
    }
  }

  if (post.visibility === "FRIENDS") {
    const isFriend = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { fromUserId: post.creatorId, toUserId: session.user.id },
          { fromUserId: session.user.id, toUserId: post.creatorId },
        ],
        status: "ACCEPTED",
      },
    });
    if (!isFriend && post.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "This game is for friends only. Add the host as a friend to join." },
        { status: 403 }
      );
    }
  }

  await prisma.$transaction([
    prisma.postParticipant.create({
      data: { postId, userId: session.user.id },
    }),
    prisma.notification.create({
      data: {
        userId: post.creatorId,
        type: "JOINED_YOUR_POST",
        data: {
          postId,
          postTitle: post.title,
          joinedUserId: session.user.id,
        },
      },
    }),
  ]);

  const newCount = post.participants.length + 1;
  if (newCount >= post.totalPlayers) {
    await prisma.post.update({
      where: { id: postId },
      data: { status: "FULL" },
    });
  }

  return NextResponse.json({ success: true });
}
