-- Drop the old image_url column and add new BYTEA-based columns
ALTER TABLE "sites" DROP COLUMN IF EXISTS "image_url";
ALTER TABLE "sites" ADD COLUMN "image_data" BYTEA;
ALTER TABLE "sites" ADD COLUMN "image_mime" VARCHAR(50);