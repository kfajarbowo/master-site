/*
  Warnings:

  - Made the column `created_at` on table `regions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `regions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "regions" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "logo_data" BYTEA,
ADD COLUMN     "logo_mime" VARCHAR(50);
