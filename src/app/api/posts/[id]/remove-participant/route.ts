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
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId query param required" },
      { status: 400 }
    );
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (userId === post.creatorId) {
    return NextResponse.json(
      { error: "Host cannot remove themselves. Delete the game instead." },
      { status: 400 }
    );
  }

  await prisma.postParticipant.deleteMany({
    where: { postId, userId },
  });

  const postAfter = await prisma.post.findUnique({
    where: { id: postId },
    include: { _count: { select: { participants: true } } },
  });

  if (
    postAfter &&
    postAfter.status === "FULL" &&
    postAfter._count.participants < postAfter.totalPlayers
  ) {
    await prisma.post.update({
      where: { id: postId },
      data: { status: "OPEN" },
    });
  }

  return NextResponse.json({ success: true });
}
