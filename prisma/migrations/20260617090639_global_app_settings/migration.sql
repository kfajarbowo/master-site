/*
  Warnings:

  - You are about to drop the column `logo_data` on the `sites` table. All the data in the column will be lost.
  - You are about to drop the column `logo_mime` on the `sites` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sites" DROP COLUMN "logo_data",
DROP COLUMN "logo_mime";

-- CreateTable
CREATE TABLE "app_settings" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "value" TEXT,
    "blob_data" BYTEA,
    "blob_mime" VARCHAR(50),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");
