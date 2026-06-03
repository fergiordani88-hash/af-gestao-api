-- CreateTable
CREATE TABLE "AgroProducao" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "safra" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cultura" TEXT NOT NULL,
    "ordem" TEXT NOT NULL,
    "cotacao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "area" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "produtividade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoPorHa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "areaArrendada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoArrendHa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgroProducao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgroContrato" (
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

    CONSTRAINT "AgroContrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgroDespesa" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgroDespesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgroReceita" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "origem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgroReceita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgroCustoFixo" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "valorMensal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgroCustoFixo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgroPatrimonio" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "identificacao" TEXT,
    "valorAvaliado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "possuiOnus" BOOLEAN NOT NULL DEFAULT false,
    "tipoOnus" TEXT,
    "credor" TEXT,
    "valorOnus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "obs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgroPatrimonio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgroProducao" ADD CONSTRAINT "AgroProducao_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgroContrato" ADD CONSTRAINT "AgroContrato_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgroDespesa" ADD CONSTRAINT "AgroDespesa_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgroReceita" ADD CONSTRAINT "AgroReceita_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgroCustoFixo" ADD CONSTRAINT "AgroCustoFixo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgroPatrimonio" ADD CONSTRAINT "AgroPatrimonio_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
