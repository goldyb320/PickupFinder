import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Please upload an image file (JPEG, PNG, GIF, WebP)" },
      { status: 400 }
    );
  }

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "Image must be under 2MB" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const validExts = ["jpg", "jpeg", "png", "gif", "webp"];
  if (!validExts.includes(ext)) {
    return NextResponse.json(
      { error: "Invalid image format. Use JPEG, PNG, GIF, or WebP." },
      { status: 400 }
    );
  }

  const filename = `${session.user.id}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");

  try {
    await mkdir(uploadDir, { recursive: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to create upload directory" },
      { status: 500 }
    );
  }

  const filepath = path.join(uploadDir, filename);
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    await writeFile(filepath, buffer);
  } catch {
    return NextResponse.json(
      { error: "Failed to save image" },
      { status: 500 }
    );
  }

  const url = `/uploads/avatars/${filename}`;
  return NextResponse.json({ url });
}
