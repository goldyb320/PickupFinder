import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  bio: z.string().max(500).nullable().optional(),
  profileImage: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { bio: true, profileImage: true, image: true, name: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...user,
    avatarUrl: user.profileImage ?? user.image ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data as Record<string, unknown>;
  const updateData: Record<string, unknown> = {};
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.profileImage !== undefined) updateData.profileImage = data.profileImage;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { bio: true, profileImage: true, image: true, name: true, email: true },
  });

  return NextResponse.json({
    ...user,
    avatarUrl: user.profileImage ?? user.image ?? null,
  });
}
