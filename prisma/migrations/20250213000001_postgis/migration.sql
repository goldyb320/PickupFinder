-- PostGIS: Enable extension, add geography column and spatial index to Location
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geom column as generated from lat/lng (SRID 4326 = WGS84)
ALTER TABLE "Location" ADD COLUMN "geom" geography(Point, 4326) 
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography) STORED;

-- Create spatial index for bounding box and distance queries
CREATE INDEX IF NOT EXISTS "Location_geom_idx" ON "Location" USING GIST ("geom");
