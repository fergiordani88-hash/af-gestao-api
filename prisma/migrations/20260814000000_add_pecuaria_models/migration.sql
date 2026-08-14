-- CreateTable
CREATE TABLE "AgroPecuariaLote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "idadeMediaMeses" DOUBLE PRECISION NOT NULL,
    "pesoMedioKg" DOUBLE PRECISION NOT NULL,
    "raca" TEXT,
    "obs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgroPecuariaLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgroPecuariaConfig" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sistema" TEXT NOT NULL DEFAULT 'extensivo',
    "areaTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "forrageira" TEXT NOT NULL DEFAULT 'marandu',
    "lotacaoReferencia" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    "fatorSeca" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "estadoPasto" TEXT NOT NULL DEFAULT 'bom',
    "silagem" DOUBLE PRECISION,
    "rotacao" JSONB,
    "suplementos" JSONB NOT NULL DEFAULT '[]',
    "ciclo" TEXT NOT NULL DEFAULT 'cria_recria_engorda',
    "taxaPrenhez" DOUBLE PRECISION NOT NULL DEFAULT 78,
    "taxaNatalidade" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "taxaMortalidadeBezerro" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "taxaDesmame" DOUBLE PRECISION NOT NULL DEFAULT 72,
    "idadeDesmameMeses" DOUBLE PRECISION NOT NULL DEFAULT 7,
    "pesoDesmameKg" DOUBLE PRECISION NOT NULL DEFAULT 190,
    "pesoAbateKg" DOUBLE PRECISION NOT NULL DEFAULT 490,
    "rendimentoCarcaca" DOUBLE PRECISION NOT NULL DEFAULT 53,
    "arrobasAbate" DOUBLE PRECISION NOT NULL DEFAULT 17,
    "idadeAbateMeses" DOUBLE PRECISION NOT NULL DEFAULT 36,
    "taxaDescarteAnual" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "diasConfinamento" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "ganhoMedioDiario" DOUBLE PRECISION NOT NULL DEFAULT 1.3,
    "praca" TEXT NOT NULL DEFAULT 'Rondonópolis',
    "precoBoiGordoArroba" DOUBLE PRECISION NOT NULL DEFAULT 320,
    "precoBezerroCabeca" DOUBLE PRECISION NOT NULL DEFAULT 2200,
    "precoGarroteCabeca" DOUBLE PRECISION NOT NULL DEFAULT 3500,
    "precoVacaDescarteCabeca" DOUBLE PRECISION NOT NULL DEFAULT 2800,
    "dataPrecos" TEXT,
    "vacinacaoAftosaAnoCab" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "vacinacaoBrucelaAnoCab" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "vermifugacaoAnoCab" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "outrosSanidadeAnoCab" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "manutencaoPastagemHaAno" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "reformaPastagemHa" DOUBLE PRECISION NOT NULL DEFAULT 1200,
    "percentualReformaAno" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "areaArrendadaHa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoArrendamentoHaAno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numFuncionarios" INTEGER NOT NULL DEFAULT 1,
    "salarioMedioMensal" DOUBLE PRECISION NOT NULL DEFAULT 2400,
    "encargosPct" DOUBLE PRECISION NOT NULL DEFAULT 33,
    "combustivelMensal" DOUBLE PRECISION NOT NULL DEFAULT 800,
    "manutencaoEquipMensal" DOUBLE PRECISION NOT NULL DEFAULT 400,
    "outrosMensal" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgroPecuariaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgroPecuariaConfig_clientId_key" ON "AgroPecuariaConfig"("clientId");

-- AddForeignKey
ALTER TABLE "AgroPecuariaLote" ADD CONSTRAINT "AgroPecuariaLote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgroPecuariaConfig" ADD CONSTRAINT "AgroPecuariaConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
