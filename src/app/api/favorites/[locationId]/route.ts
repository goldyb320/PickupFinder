import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { locationId } = await params;

  await prisma.favoriteLocation.upsert({
    where: {
      userId_locationId: {
        userId: session.user.id,
        locationId,
      },
    },
    create: {
      userId: session.user.id,
      locationId,
    },
    update: {},
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { locationId } = await params;

  await prisma.favoriteLocation.deleteMany({
    where: {
      userId: session.user.id,
      locationId,
    },
  });

  return NextResponse.json({ success: true });
}
