import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const devEmail = process.env.DEV_USER_EMAIL ?? "dev@example.com";

  let devUser = await prisma.user.findUnique({
    where: { email: devEmail },
  });

  if (!devUser) {
    devUser = await prisma.user.create({
      data: {
        email: devEmail,
        name: "Dev User",
        emailVerified: new Date(),
      },
    });
    console.log("Created dev user:", devEmail);
  }

  const locations = [
    { label: "Lincoln Park Courts", lat: 41.9217, lng: -87.6369 },
    { label: "Grant Park Soccer Fields", lat: 41.8722, lng: -87.6194 },
    { label: "North Avenue Beach", lat: 41.9134, lng: -87.6262 },
    { label: "Wicker Park", lat: 41.9092, lng: -87.6776 },
  ];

  for (const loc of locations) {
    const existing = await prisma.location.findFirst({
      where: { label: loc.label },
    });
    if (!existing) {
      await prisma.location.create({
        data: {
          ...loc,
          createdById: devUser.id,
        },
      });
      console.log("Created location:", loc.label);
    }
  }

  const locs = await prisma.location.findMany({ take: 4 });
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  const posts = await prisma.post.findMany({ take: 5 });
  if (posts.length === 0 && locs.length > 0) {
    await prisma.post.create({
      data: {
        creatorId: devUser.id,
        locationId: locs[0].id,
        sport: "BASKETBALL",
        title: "Casual pickup basketball",
        description: "Bring your own ball. All skill levels welcome.",
        skillLevel: "CASUAL",
        visibility: "PUBLIC",
        startTime: tomorrow,
        durationMinutes: 90,
        totalPlayers: 6,
        expiresAt: new Date(tomorrow.getTime() + 30 * 60 * 1000),
      },
    });
    await prisma.post.create({
      data: {
        creatorId: devUser.id,
        locationId: locs[1]?.id ?? locs[0].id,
        sport: "SOCCER",
        title: "Evening soccer",
        description: "Small-sided game",
        skillLevel: "MEDIUM",
        visibility: "PUBLIC",
        startTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        durationMinutes: 90,
        totalPlayers: 10,
        expiresAt: new Date(tomorrow.getTime() + 2.5 * 60 * 60 * 1000),
      },
    });
    console.log("Created sample posts");
  }

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
