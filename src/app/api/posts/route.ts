import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createPostSchema = z.object({
  locationId: z.string(),
  sport: z.enum([
    "BASKETBALL",
    "SOCCER",
    "TENNIS",
    "VOLLEYBALL",
    "PICKLEBALL",
    "ULTIMATE",
    "FLAG_FOOTBALL",
    "OTHER",
  ]),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  skillLevel: z.enum(["CASUAL", "MEDIUM", "COMPETITIVE"]),
  visibility: z.enum(["PUBLIC", "FRIENDS", "INVITE_ONLY"]),
  startTime: z.string().datetime(),
  durationMinutes: z.number().min(15).max(480).default(90),
  totalPlayers: z.number().min(2).max(50).default(6),
  taggedUserIds: z.array(z.string()).optional(),
  invitedFriendIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const startTime = new Date(data.startTime);
  const expiresAt = new Date(
    startTime.getTime() + 30 * 60 * 1000
  );

  const location = await prisma.location.findUnique({
    where: { id: data.locationId },
  });
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      creatorId: session.user.id,
      locationId: data.locationId,
      sport: data.sport,
      title: data.title,
      description: data.description ?? "",
      skillLevel: data.skillLevel,
      visibility: data.visibility,
      startTime,
      durationMinutes: data.durationMinutes,
      totalPlayers: data.totalPlayers,
      expiresAt,
    },
    include: {
      location: true,
      creator: { select: { id: true, name: true, image: true } },
    },
  });

  await prisma.postParticipant.create({
    data: { postId: post.id, userId: session.user.id },
  });

  const invitedIds = data.invitedFriendIds ?? [];
  if (invitedIds.length > 0) {
    await prisma.$transaction([
      prisma.postParticipant.createMany({
        data: invitedIds.map((userId) => ({ postId: post.id, userId })),
        skipDuplicates: true,
      }),
      prisma.postTag.createMany({
        data: invitedIds.map((userId) => ({ postId: post.id, userId })),
        skipDuplicates: true,
      }),
    ]);
    for (const userId of invitedIds) {
      await prisma.notification.create({
        data: {
          userId,
          type: "TAGGED_IN_POST",
          data: {
            postId: post.id,
            postTitle: post.title,
            taggedBy: session.user.id,
          },
        },
      });
    }
  }

  const taggedOnly = (data.taggedUserIds ?? []).filter(
    (id) => !invitedIds.includes(id)
  );
  if (taggedOnly.length > 0) {
    await prisma.postTag.createMany({
      data: taggedOnly.map((userId) => ({ postId: post.id, userId })),
      skipDuplicates: true,
    });

    for (const userId of taggedOnly) {
      await prisma.notification.create({
        data: {
          userId,
          type: "TAGGED_IN_POST",
          data: {
            postId: post.id,
            postTitle: post.title,
            taggedBy: session.user.id,
          },
        },
      });
    }
  }

  return NextResponse.json(post);
}
