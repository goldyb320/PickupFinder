-- Add unique constraint on Location to prevent duplicate (label, lat, lng)
-- Run `npm run db:deduplicate-locations` first if you have existing duplicates
CREATE UNIQUE INDEX IF NOT EXISTS "Location_label_lat_lng_key" ON "Location"("label", "lat", "lng");

-- Simplify PostTag: remove redundant id column, use composite primary key
ALTER TABLE "PostTag" DROP CONSTRAINT IF EXISTS "PostTag_pkey";
DROP INDEX IF EXISTS "PostTag_postId_userId_key";
ALTER TABLE "PostTag" DROP COLUMN IF EXISTS "id";
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_pkey" PRIMARY KEY ("postId", "userId");
