-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CONSULTOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'MT',
    "address" TEXT,
    "zipCode" TEXT,
    "segment" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT 'MEDIA',
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'LEAD',
    "notes" TEXT,
    "responsibleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "nextSteps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "description" TEXT,
    "monthlyValue" DOUBLE PRECISION NOT NULL,
    "setupFee" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticoPJ" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "consultorId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "segment" TEXT,
    "employees" INTEGER,
    "grossRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cmv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variableExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "financialExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proLabore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDebt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shortTermDebt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "hasAccounting" BOOLEAN NOT NULL DEFAULT false,
    "hasERP" BOOLEAN NOT NULL DEFAULT false,
    "hasFinancialControl" BOOLEAN NOT NULL DEFAULT false,
    "classification" TEXT,
    "grossMargin" DOUBLE PRECISION,
    "netMargin" DOUBLE PRECISION,
    "ebitda" DOUBLE PRECISION,
    "breakeven" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticoPJ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticoAgro" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "consultorId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "ownArea" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leasedArea" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leaseValueHa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cultures" TEXT NOT NULL,
    "custeioValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custeioBank" TEXT,
    "custeioRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "investValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "investBank" TEXT,
    "investRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cprValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cprBank" TEXT,
    "propertyValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "machineryValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasInsurance" BOOLEAN NOT NULL DEFAULT false,
    "hasPlanning" BOOLEAN NOT NULL DEFAULT false,
    "hasFinancialCtrl" BOOLEAN NOT NULL DEFAULT false,
    "classification" TEXT,
    "totalRevenue" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "margin" DOUBLE PRECISION,
    "revenueHa" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticoAgro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlow" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditOperation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "creditLine" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "guarantees" TEXT,
    "startDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ANALISE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "consultorId" TEXT NOT NULL,
    "diagnosticoPJId" TEXT,
    "diagnosticoAgroId" TEXT,
    "area" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "deadline" TIMESTAMP(3) NOT NULL,
    "responsible" TEXT NOT NULL,
    "expectedResult" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NAO_INICIADO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "diagnosticoPJId" TEXT,
    "diagnosticoAgroId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "size" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_document_key" ON "Client"("document");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticoPJ" ADD CONSTRAINT "DiagnosticoPJ_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticoPJ" ADD CONSTRAINT "DiagnosticoPJ_consultorId_fkey" FOREIGN KEY ("consultorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticoAgro" ADD CONSTRAINT "DiagnosticoAgro_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticoAgro" ADD CONSTRAINT "DiagnosticoAgro_consultorId_fkey" FOREIGN KEY ("consultorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlow" ADD CONSTRAINT "CashFlow_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditOperation" ADD CONSTRAINT "CreditOperation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_consultorId_fkey" FOREIGN KEY ("consultorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_diagnosticoPJId_fkey" FOREIGN KEY ("diagnosticoPJId") REFERENCES "DiagnosticoPJ"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_diagnosticoAgroId_fkey" FOREIGN KEY ("diagnosticoAgroId") REFERENCES "DiagnosticoAgro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_diagnosticoPJId_fkey" FOREIGN KEY ("diagnosticoPJId") REFERENCES "DiagnosticoPJ"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_diagnosticoAgroId_fkey" FOREIGN KEY ("diagnosticoAgroId") REFERENCES "DiagnosticoAgro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
