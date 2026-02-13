import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  requestId: z.string(),
  action: z.enum(["ACCEPT", "DECLINE"]),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { requestId, action } = parsed.data;

  const fr = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!fr || fr.toUserId !== session.user.id) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (fr.status !== "PENDING") {
    return NextResponse.json(
      { error: "Request already responded to" },
      { status: 400 }
    );
  }

  await prisma.friendRequest.update({
    where: { id: requestId },
    data: {
      status: action === "ACCEPT" ? "ACCEPTED" : "DECLINED",
    },
  });

  await prisma.$executeRaw`
    DELETE FROM "Notification"
    WHERE "userId" = ${session.user.id}
    AND type = 'FRIEND_REQUEST'
    AND data->>'requestId' = ${requestId}
  `;

  return NextResponse.json({ success: true });
}
