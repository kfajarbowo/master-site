-- CreateEnum
-- This is an empty migration. The enum "AppCategory" already exists.

-- CreateTable
CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "region_code" VARCHAR(10) NOT NULL,
    "region_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_region_code_key" ON "regions"("region_code");

-- AlterTable: Add region_id to sites (nullable for backward compatibility)
ALTER TABLE "sites" ADD COLUMN "region_id" INTEGER;

-- AddForeignKey: region_id references regions(id), ON DELETE SET NULL
ALTER TABLE "sites" ADD CONSTRAINT "sites_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;