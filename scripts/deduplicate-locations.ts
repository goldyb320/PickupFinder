/**
 * Deduplicate locations: merge exact duplicates (same label, lat, lng)
 * and remove the extras. Run with: npx tsx scripts/deduplicate-locations.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EPSILON = 1e-6;

function sameLocation(
  a: { label: string; lat: number; lng: number },
  b: { label: string; lat: number; lng: number }
) {
  return (
    a.label === b.label &&
    Math.abs(a.lat - b.lat) < EPSILON &&
    Math.abs(a.lng - b.lng) < EPSILON
  );
}

async function main() {
  const locations = await prisma.location.findMany({ orderBy: { createdAt: "asc" } });
  const groups: { id: string; label: string; lat: number; lng: number }[][] = [];

  for (const loc of locations) {
    let found = false;
    for (const group of groups) {
      if (sameLocation(group[0], loc)) {
        group.push(loc);
        found = true;
        break;
      }
    }
    if (!found) groups.push([loc]);
  }

  const duplicates = groups.filter((g) => g.length > 1);
  if (duplicates.length === 0) {
    console.log("No duplicate locations found.");
    return;
  }

  let merged = 0;
  for (const group of duplicates) {
    const [keep, ...remove] = group;
    for (const dup of remove) {
      await prisma.post.updateMany({
        where: { locationId: dup.id },
        data: { locationId: keep.id },
      });

      const favs = await prisma.favoriteLocation.findMany({ where: { locationId: dup.id } });
      for (const fav of favs) {
        const existing = await prisma.favoriteLocation.findUnique({
          where: { userId_locationId: { userId: fav.userId, locationId: keep.id } },
        });
        if (!existing) {
          await prisma.favoriteLocation.create({
            data: { userId: fav.userId, locationId: keep.id },
          });
        }
        await prisma.favoriteLocation.delete({
          where: { userId_locationId: { userId: fav.userId, locationId: dup.id } },
        });
      }

      await prisma.location.delete({ where: { id: dup.id } });
      merged++;
    }
  }

  console.log(`Merged ${merged} duplicate location(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
