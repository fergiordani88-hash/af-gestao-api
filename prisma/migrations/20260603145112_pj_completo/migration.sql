-- CreateTable
CREATE TABLE "PJDre" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL DEFAULT 'mensal',
    "receitaBruta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cmv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "despesasFixas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "folha" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proLabore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tributos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "despesasFinanceiras" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parcela" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "caixa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aReceber" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estoque" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aFornecedores" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dividaTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dividaCP" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diasEstoque" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "lucroInformadoSocio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PJDre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PJRecebimento" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "forma" TEXT NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prazoMedio" INTEGER NOT NULL DEFAULT 0,
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "obs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PJRecebimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PJPagamento" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "forma" TEXT NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prazoMedio" INTEGER NOT NULL DEFAULT 0,
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "obs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PJPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PJContrato" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "modalidade" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "numeroContrato" TEXT,
    "dataContratacao" TIMESTAMP(3) NOT NULL,
    "valorTomado" DOUBLE PRECISION NOT NULL,
    "totalParcelas" INTEGER NOT NULL,
    "parcelaAtual" INTEGER NOT NULL,
    "periodicidade" TEXT NOT NULL,
    "taxa" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "valorParcela" DOUBLE PRECISION NOT NULL,
    "obs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PJContrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PJDespesa" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PJDespesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PJReceita" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "origem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PJReceita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PJCustoFixo" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "valorMensal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PJCustoFixo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PJStressTest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "variacaoQueda" DOUBLE PRECISION NOT NULL DEFAULT -0.3,
    "variacaoAlta" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "pctCustoVar" DOUBLE PRECISION NOT NULL DEFAULT 0.48,
    "pctDespFixaVar" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "saldoInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PJStressTest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PJDre" ADD CONSTRAINT "PJDre_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PJRecebimento" ADD CONSTRAINT "PJRecebimento_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PJPagamento" ADD CONSTRAINT "PJPagamento_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PJContrato" ADD CONSTRAINT "PJContrato_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PJDespesa" ADD CONSTRAINT "PJDespesa_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PJReceita" ADD CONSTRAINT "PJReceita_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PJCustoFixo" ADD CONSTRAINT "PJCustoFixo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PJStressTest" ADD CONSTRAINT "PJStressTest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
