import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ joinedIds: [] });
  }

  const participants = await prisma.postParticipant.findMany({
    where: { userId: session.user.id },
    select: { postId: true },
  });

  return NextResponse.json({
    joinedIds: participants.map((p) => p.postId),
  });
}
