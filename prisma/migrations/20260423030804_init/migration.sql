-- CreateEnum
CREATE TYPE "AppCategory" AS ENUM ('SERVER', 'APP');

-- CreateTable
CREATE TABLE "sites" (
    "id" SERIAL NOT NULL,
    "site_code" VARCHAR(10) NOT NULL,
    "site_name" VARCHAR(100) NOT NULL,
    "block_ip" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_types" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "AppCategory" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_highlighted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "app_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_ips" (
    "id" SERIAL NOT NULL,
    "site_id" INTEGER NOT NULL,
    "app_type_id" INTEGER NOT NULL,
    "ip_address" VARCHAR(20) NOT NULL,
    "subnet" VARCHAR(5) NOT NULL DEFAULT '/27',
    "port" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_ips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sites_site_code_key" ON "sites"("site_code");

-- CreateIndex
CREATE UNIQUE INDEX "app_types_key_key" ON "app_types"("key");

-- CreateIndex
CREATE UNIQUE INDEX "site_ips_site_id_app_type_id_key" ON "site_ips"("site_id", "app_type_id");

-- AddForeignKey
ALTER TABLE "site_ips" ADD CONSTRAINT "site_ips_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_ips" ADD CONSTRAINT "site_ips_app_type_id_fkey" FOREIGN KEY ("app_type_id") REFERENCES "app_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
