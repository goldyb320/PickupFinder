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

  const { id: userId } = await params;

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Use /profile for your own profile" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, profileImage: true, bio: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [friendship, pendingFromMe] = await Promise.all([
    prisma.friendRequest.findFirst({
      where: {
        OR: [
          { fromUserId: session.user.id, toUserId: userId },
          { fromUserId: userId, toUserId: session.user.id },
        ],
        status: "ACCEPTED",
      },
    }),
    prisma.friendRequest.findFirst({
      where: {
        fromUserId: session.user.id,
        toUserId: userId,
        status: "PENDING",
      },
    }),
  ]);

  const isFriend = !!friendship;
  const requestPending = !!pendingFromMe;

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: isFriend ? user.email : null,
    avatarUrl: user.profileImage ?? user.image ?? null,
    bio: user.bio,
    isFriend,
    requestPending,
  });
}
