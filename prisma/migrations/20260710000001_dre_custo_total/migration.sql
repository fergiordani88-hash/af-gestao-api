-- AlterTable: add custoAtivTotal to AgroDRERural
ALTER TABLE "AgroDRERural" ADD COLUMN IF NOT EXISTS "custoAtivTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;
