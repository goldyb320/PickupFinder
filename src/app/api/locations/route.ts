import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createLocationSchema = z.object({
  label: z.string().min(1).max(200),
  lat: z.number(),
  lng: z.number(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { label, lat, lng } = parsed.data;
  const epsilon = 1e-6; // ~0.1m tolerance for coordinate comparison

  const existing = await prisma.location.findFirst({
    where: {
      label,
      lat: { gte: lat - epsilon, lte: lat + epsilon },
      lng: { gte: lng - epsilon, lte: lng + epsilon },
    },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  try {
    const location = await prisma.location.create({
      data: {
        label,
        lat,
        lng,
        createdById: session.user.id,
      },
    });
    return NextResponse.json(location);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      const existing = await prisma.location.findFirst({
        where: {
          label,
          lat: { gte: lat - epsilon, lte: lat + epsilon },
          lng: { gte: lng - epsilon, lte: lng + epsilon },
        },
      });
      if (existing) return NextResponse.json(existing);
    }
    throw e;
  }
}
