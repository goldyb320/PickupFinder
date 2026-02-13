import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getCronSecret(request: NextRequest): string | null {
  const header = request.headers.get("x-cron-secret");
  if (header) return header;
  const url = new URL(request.url);
  return url.searchParams.get("secret");
}

export async function GET(request: NextRequest) {
  const secret = getCronSecret(request);
  const expected = process.env.CRON_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.post.updateMany({
    where: {
      expiresAt: { lte: new Date() },
      status: { notIn: ["EXPIRED", "CANCELLED"] },
    },
    data: { status: "EXPIRED" },
  });

  return NextResponse.json({
    success: true,
    expired: result.count,
  });
}
