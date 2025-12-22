/*
  Warnings:

  - You are about to drop the column `code` on the `packages` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code-hash]` on the table `packages` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code-expires-at` to the `packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code-hash` to the `packages` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."packages_code_key";

-- AlterTable
ALTER TABLE "packages" DROP COLUMN "code",
ADD COLUMN     "code-attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "code-expires-at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "code-hash" TEXT NOT NULL,
ADD COLUMN     "code-hint" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "packages_code-hash_key" ON "packages"("code-hash");
