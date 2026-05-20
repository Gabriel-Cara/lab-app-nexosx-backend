-- Rename role values to the new authorization model.
-- Old master => admin, old admin => manager, old staff => doorman.
ALTER TYPE "Role" RENAME VALUE 'admin' TO 'manager';
ALTER TYPE "Role" RENAME VALUE 'staff' TO 'doorman';
ALTER TYPE "Role" RENAME VALUE 'master' TO 'admin';

-- New condominium structure: Condominium -> Block -> Residence -> Users.
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condominium-id" TEXT NOT NULL,
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated-at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "residences" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "block-id" TEXT NOT NULL,
    "condominium-id" TEXT NOT NULL,
    "created-at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated-at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "residences_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "users" ADD COLUMN "residence-id" TEXT;

CREATE UNIQUE INDEX "blocks_condominium-id_name_key" ON "blocks"("condominium-id", "name");
CREATE UNIQUE INDEX "residences_block-id_number_key" ON "residences"("block-id", "number");
CREATE INDEX "residences_condominium-id_idx" ON "residences"("condominium-id");
CREATE INDEX "users_residence-id_idx" ON "users"("residence-id");

ALTER TABLE "blocks" ADD CONSTRAINT "blocks_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "residences" ADD CONSTRAINT "residences_block-id_fkey" FOREIGN KEY ("block-id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "residences" ADD CONSTRAINT "residences_condominium-id_fkey" FOREIGN KEY ("condominium-id") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_residence-id_fkey" FOREIGN KEY ("residence-id") REFERENCES "residences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill residences from the legacy apartment/building fields.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "blocks" ("id", "name", "condominium-id", "created-at", "updated-at")
SELECT
  gen_random_uuid()::TEXT,
  source."block-name",
  source."condominium-id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT
    u."condominium-id",
    COALESCE(NULLIF(TRIM(ri."building"), ''), 'Bloco único') AS "block-name"
  FROM "users" u
  LEFT JOIN "resident-infos" ri ON ri."user-id" = u."id"
  WHERE u."role" = 'resident'
    AND u."condominium-id" IS NOT NULL
    AND u."apartment" IS NOT NULL
    AND TRIM(u."apartment") <> ''
) AS source
ON CONFLICT ("condominium-id", "name") DO NOTHING;

INSERT INTO "residences" ("id", "number", "block-id", "condominium-id", "created-at", "updated-at")
SELECT
  gen_random_uuid()::TEXT,
  source."number",
  b."id",
  source."condominium-id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT
    u."condominium-id",
    COALESCE(NULLIF(TRIM(ri."building"), ''), 'Bloco único') AS "block-name",
    TRIM(u."apartment") AS "number"
  FROM "users" u
  LEFT JOIN "resident-infos" ri ON ri."user-id" = u."id"
  WHERE u."role" = 'resident'
    AND u."condominium-id" IS NOT NULL
    AND u."apartment" IS NOT NULL
    AND TRIM(u."apartment") <> ''
) AS source
JOIN "blocks" b
  ON b."condominium-id" = source."condominium-id"
 AND b."name" = source."block-name"
ON CONFLICT ("block-id", "number") DO NOTHING;

WITH resident_addresses AS (
  SELECT
    u."id" AS "user-id",
    u."condominium-id",
    COALESCE(NULLIF(TRIM(ri."building"), ''), 'Bloco único') AS "block-name",
    TRIM(u."apartment") AS "number"
  FROM "users" u
  LEFT JOIN "resident-infos" ri ON ri."user-id" = u."id"
  WHERE u."role" = 'resident'
    AND u."condominium-id" IS NOT NULL
    AND u."apartment" IS NOT NULL
    AND TRIM(u."apartment") <> ''
)
UPDATE "users" u
SET "residence-id" = r."id"
FROM resident_addresses a
JOIN "blocks" b
  ON b."condominium-id" = a."condominium-id"
 AND b."name" = a."block-name"
JOIN "residences" r
  ON r."block-id" = b."id"
 AND r."number" = a."number"
WHERE u."id" = a."user-id";
