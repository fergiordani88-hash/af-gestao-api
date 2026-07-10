-- AlterTable: add custoAtivTotal to AgroDreRural
ALTER TABLE "AgroDreRural" ADD COLUMN IF NOT EXISTS "custoAtivTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;
