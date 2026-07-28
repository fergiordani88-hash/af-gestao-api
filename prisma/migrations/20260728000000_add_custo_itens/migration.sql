-- AddColumn: custoItens Json nullable to AgroProducao
ALTER TABLE "AgroProducao" ADD COLUMN IF NOT EXISTS "custoItens" JSONB;
