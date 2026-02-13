import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.notification.count({
    where: {
      userId: session.user.id,
      readAt: null,
    },
  });

  return NextResponse.json({ count });
}
