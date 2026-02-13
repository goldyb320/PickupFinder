import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  skillLevel: z.enum(["CASUAL", "MEDIUM", "COMPETITIVE"]).optional(),
  visibility: z.enum(["PUBLIC", "FRIENDS", "INVITE_ONLY"]).optional(),
  startTime: z.string().datetime().optional(),
  durationMinutes: z.number().min(15).max(480).optional(),
  totalPlayers: z.number().min(2).max(50).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      location: true,
      creator: {
        select: { id: true, name: true, image: true, email: true },
      },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.status === "CANCELLED" || post.status === "EXPIRED") {
    return NextResponse.json({ error: "Post no longer available" }, { status: 410 });
  }

  if (new Date(post.expiresAt) <= new Date()) {
    return NextResponse.json({ error: "Post has expired" }, { status: 410 });
  }

  return NextResponse.json({
    ...post,
    startTime: post.startTime.toISOString(),
    expiresAt: post.expiresAt.toISOString(),
    joinedCount: post.participants.length,
    participants: post.participants,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (post.status !== "OPEN" && post.status !== "FULL") {
    return NextResponse.json(
      { error: "Cannot edit cancelled or expired post" },
      { status: 400 }
    );
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
  if (data.startTime) {
    data.startTime = new Date(data.startTime as string);
    data.expiresAt = new Date(
      (data.startTime as Date).getTime() + 30 * 60 * 1000
    );
  }

  const updated = await prisma.post.update({
    where: { id },
    data: data as Parameters<typeof prisma.post.update>[0]["data"],
    include: {
      location: true,
      creator: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json({
    ...updated,
    startTime: updated.startTime.toISOString(),
    expiresAt: updated.expiresAt.toISOString(),
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

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.post.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
