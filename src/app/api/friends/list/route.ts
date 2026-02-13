import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.friendRequest.findMany({
    where: {
      OR: [
        { fromUserId: session.user.id },
        { toUserId: session.user.id },
      ],
      status: "ACCEPTED",
    },
    include: {
      fromUser: { select: { id: true, name: true, email: true, image: true, profileImage: true } },
      toUser: { select: { id: true, name: true, email: true, image: true, profileImage: true } },
    },
  });

  const friends = requests.map((r) => {
    const user = r.fromUserId === session.user!.id! ? r.toUser : r.fromUser;
    return {
      ...user,
      avatarUrl: user.profileImage ?? user.image ?? null,
    };
  });

  return NextResponse.json(friends);
}
