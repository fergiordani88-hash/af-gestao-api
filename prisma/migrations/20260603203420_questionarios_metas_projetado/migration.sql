-- CreateTable
CREATE TABLE "QuestionarioPJ" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "identificacao" TEXT NOT NULL DEFAULT '{}',
    "negocio" TEXT NOT NULL DEFAULT '{}',
    "faturamento" TEXT NOT NULL DEFAULT '{}',
    "fornecedores" TEXT NOT NULL DEFAULT '{}',
    "estoque" TEXT NOT NULL DEFAULT '{}',
    "equipe" TEXT NOT NULL DEFAULT '{}',
    "bancos" TEXT NOT NULL DEFAULT '{}',
    "impostos" TEXT NOT NULL DEFAULT '{}',
    "gestaoFinanceira" TEXT NOT NULL DEFAULT '{}',
    "planejamento" TEXT NOT NULL DEFAULT '{}',
    "percentualConclusao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataUltimaEdicao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionarioPJ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionarioAgro" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "identificacao" TEXT NOT NULL DEFAULT '{}',
    "produtividade" TEXT NOT NULL DEFAULT '{}',
    "fornecedores" TEXT NOT NULL DEFAULT '{}',
    "prestadores" TEXT NOT NULL DEFAULT '{}',
    "logistica" TEXT NOT NULL DEFAULT '{}',
    "comercializacao" TEXT NOT NULL DEFAULT '{}',
    "gestaoFinanceira" TEXT NOT NULL DEFAULT '{}',
    "bancos" TEXT NOT NULL DEFAULT '{}',
    "patrimonio" TEXT NOT NULL DEFAULT '{}',
    "sucessao" TEXT NOT NULL DEFAULT '{}',
    "percentualConclusao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataUltimaEdicao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionarioAgro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "indicador" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "valorMeta" DOUBLE PRECISION NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT '%',
    "prazo" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'em_andamento',
    "obs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PJDreProjetado" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "receitaBruta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cmv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "despesasFixas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "folha" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proLabore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tributos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "despFinanceiras" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parcela" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PJDreProjetado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionarioPJ_clientId_key" ON "QuestionarioPJ"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionarioAgro_clientId_key" ON "QuestionarioAgro"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PJDreProjetado_clientId_ano_mes_key" ON "PJDreProjetado"("clientId", "ano", "mes");

-- AddForeignKey
ALTER TABLE "QuestionarioPJ" ADD CONSTRAINT "QuestionarioPJ_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionarioAgro" ADD CONSTRAINT "QuestionarioAgro_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PJDreProjetado" ADD CONSTRAINT "PJDreProjetado_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
