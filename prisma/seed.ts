import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Limpar tabelas (ordem para respeitar FK)
  await prisma.document.deleteMany()
  await prisma.actionPlan.deleteMany()
  await prisma.creditOperation.deleteMany()
  await prisma.cashFlow.deleteMany()
  await prisma.diagnosticoPJ.deleteMany()
  await prisma.diagnosticoAgro.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.contract.deleteMany()
  await prisma.client.deleteMany()
  await prisma.user.deleteMany()

  // ── Usuários ──────────────────────────────────────────────────
  const senhaAdmin = await bcrypt.hash('admin123', 10)
  const senhaConsultor = await bcrypt.hash('consultor123', 10)
  const senhaCliente = await bcrypt.hash('cliente123', 10)

  const ana = await prisma.user.create({
    data: { name: 'Ana Paula', email: 'ana@afgestao.com.br', password: senhaAdmin, role: 'ADMIN' }
  })
  const carlos = await prisma.user.create({
    data: { name: 'Carlos Mendes', email: 'carlos@afgestao.com.br', password: senhaConsultor, role: 'CONSULTOR' }
  })
  // Clientes criados depois de vincular com clients

  // ── Clientes ──────────────────────────────────────────────────
  const fazenda = await prisma.client.create({
    data: {
      name: 'Fazenda São Pedro',
      document: '123.456.789-00',
      phone: '(65) 99999-1111',
      email: 'joao@fazendaspecro.com.br',
      segment: 'AGRO',
      size: 'MEDIA',
      revenue: 4500000,
      status: 'ATIVO',
      city: 'Sorriso',
      state: 'MT',
      notes: 'Produtor de soja e milho, 1800ha próprios.',
      responsibleId: ana.id,
    }
  })

  const comercio = await prisma.client.create({
    data: {
      name: 'Comércio Expresso Ltda',
      document: '12.345.678/0001-99',
      phone: '(65) 98888-2222',
      email: 'financeiro@comercioexpresso.com.br',
      segment: 'COMERCIO',
      size: 'PEQUENA',
      revenue: 980000,
      status: 'ATIVO',
      city: 'Cuiabá',
      state: 'MT',
      responsibleId: carlos.id,
    }
  })

  const transportes = await prisma.client.create({
    data: {
      name: 'Transportes Ágil S/A',
      document: '98.765.432/0001-11',
      phone: '(65) 97777-3333',
      email: 'cfo@transportesagil.com.br',
      segment: 'SERVICOS',
      size: 'MEDIA',
      revenue: 3200000,
      status: 'NEGOCIACAO',
      city: 'Rondonópolis',
      state: 'MT',
      responsibleId: ana.id,
    }
  })

  const agropec = await prisma.client.create({
    data: {
      name: 'Agropecuária Vidal',
      document: '456.789.123-00',
      phone: '(66) 96666-4444',
      email: 'vidal@agropecvidal.com.br',
      segment: 'AGRO',
      size: 'GRANDE',
      revenue: 12000000,
      status: 'ATIVO',
      city: 'Nova Mutum',
      state: 'MT',
      responsibleId: carlos.id,
    }
  })

  const industria = await prisma.client.create({
    data: {
      name: 'Indústria Metálica Norte',
      document: '11.222.333/0001-44',
      phone: '(65) 95555-5555',
      email: 'diretoria@metalicanol.com.br',
      segment: 'INDUSTRIA',
      size: 'MEDIA',
      revenue: 5600000,
      status: 'PROPOSTA',
      city: 'Várzea Grande',
      state: 'MT',
      responsibleId: carlos.id,
    }
  })

  const joaoCarlos = await prisma.client.create({
    data: {
      name: 'João Carlos Produtor',
      document: '789.456.123-00',
      phone: '(66) 94444-6666',
      email: 'joaocarlos@email.com',
      segment: 'AGRO',
      size: 'PEQUENA',
      revenue: 1200000,
      status: 'LEAD',
      city: 'Campo Verde',
      state: 'MT',
      responsibleId: ana.id,
    }
  })

  // Criar usuários clientes vinculados
  await prisma.user.create({
    data: {
      name: 'Fazenda São Pedro',
      email: 'joao@fazendaspecro.com.br',
      password: senhaCliente,
      role: 'CLIENTE_RURAL',
    }
  })
  await prisma.user.create({
    data: {
      name: 'Comércio Expresso',
      email: 'financeiro@comercioexpresso.com.br',
      password: senhaCliente,
      role: 'CLIENTE_EMPRESA',
    }
  })

  // ── Contratos ─────────────────────────────────────────────────
  await prisma.contract.createMany({
    data: [
      {
        clientId: fazenda.id,
        plan: 'Consultoria Agro 360°',
        monthlyValue: 3500,
        startDate: new Date('2024-01-15'),
        renewalDate: new Date('2025-01-15'),
        status: 'ATIVO',
      },
      {
        clientId: comercio.id,
        plan: 'Gestão Financeira Empresarial',
        monthlyValue: 2200,
        startDate: new Date('2024-02-10'),
        renewalDate: new Date('2025-02-10'),
        status: 'ATIVO',
      },
      {
        clientId: agropec.id,
        plan: 'Consultoria Agro Premium',
        monthlyValue: 6800,
        startDate: new Date('2024-01-20'),
        renewalDate: new Date('2025-01-20'),
        status: 'ATIVO',
      },
    ]
  })

  // ── Diagnóstico Agro (Fazenda São Pedro) ──────────────────────
  const diagAgro = await prisma.diagnosticoAgro.create({
    data: {
      clientId: fazenda.id,
      consultorId: ana.id,
      season: '2024/2025',
      ownArea: 1200,
      leasedArea: 600,
      leaseValueHa: 1800,
      cultures: JSON.stringify([
        { culture: 'Soja', area: 1800, productivity: 58, price: 118, costHa: 6500 },
        { culture: 'Milho 2ª', area: 1200, productivity: 100, price: 48, costHa: 2800 },
      ]),
      custeioValue: 1200000,
      custeioBank: 'Sicoob',
      custeioRate: 12,
      investValue: 800000,
      investBank: 'BB',
      investRate: 8.5,
      cprValue: 350000,
      cprBank: 'Bunge',
      propertyValue: 8000000,
      machineryValue: 2500000,
      hasInsurance: false,
      hasPlanning: true,
      hasFinancialCtrl: false,
      classification: 'ATENCAO',
      totalRevenue: 12372000,
      totalCost: 10134000,
      margin: 18.1,
      revenueHa: 6873.3,
    }
  })

  // ── Diagnóstico PJ (Comércio Expresso) ────────────────────────
  const diagPJ = await prisma.diagnosticoPJ.create({
    data: {
      clientId: comercio.id,
      consultorId: carlos.id,
      period: '2024-S1',
      segment: 'COMERCIO',
      employees: 12,
      grossRevenue: 980000,
      deductions: 88200,
      cmv: 392000,
      fixedExpenses: 196000,
      variableExpenses: 78400,
      financialExpenses: 39200,
      proLabore: 48000,
      totalDebt: 320000,
      shortTermDebt: 180000,
      bankName: 'Itaú',
      hasAccounting: true,
      hasERP: false,
      hasFinancialControl: false,
      classification: 'ATENCAO',
      grossMargin: 44.5,
      netMargin: 13.8,
      ebitda: 177400,
      breakeven: 447000,
    }
  })

  // ── Fluxo de Caixa ────────────────────────────────────────────
  const cashFlows = []
  const months = [
    { m: 1, in: 85000, out: 72000 }, { m: 2, in: 92000, out: 88000 },
    { m: 3, in: 78000, out: 91000 }, { m: 4, in: 105000, out: 82000 },
    { m: 5, in: 98000, out: 95000 }, { m: 6, in: 120000, out: 88000 },
  ]
  for (const { m, in: inflow, out: outflow } of months) {
    cashFlows.push(
      { clientId: comercio.id, year: 2024, month: m, type: 'ENTRADA', category: 'Vendas', description: `Recebimentos ${m}/2024`, value: inflow, dueDate: new Date(`2024-${String(m).padStart(2,'0')}-05`), status: 'PAGO' },
      { clientId: comercio.id, year: 2024, month: m, type: 'SAIDA', category: 'Operacional', description: `Pagamentos ${m}/2024`, value: outflow, dueDate: new Date(`2024-${String(m).padStart(2,'0')}-10`), status: 'PAGO' },
    )
  }
  await prisma.cashFlow.createMany({ data: cashFlows })

  // ── Planos de Ação ────────────────────────────────────────────
  await prisma.actionPlan.createMany({
    data: [
      {
        clientId: fazenda.id,
        consultorId: ana.id,
        diagnosticoAgroId: diagAgro.id,
        area: 'Crédito Rural',
        action: 'Renegociar custeio no Sicoob',
        objective: 'Reduzir taxa de 12% para 9% a.a.',
        priority: 'IMEDIATA',
        deadline: new Date('2024-06-15'),
        responsible: 'Ana Paula',
        expectedResult: 'Economia de R$ 36.000/ano em juros',
        status: 'EM_ANDAMENTO',
      },
      {
        clientId: fazenda.id,
        consultorId: ana.id,
        diagnosticoAgroId: diagAgro.id,
        area: 'Financeiro',
        action: 'Implantar controle de fluxo de caixa semanal',
        objective: 'Previsibilidade financeira da safra',
        priority: 'ALTA',
        deadline: new Date('2024-06-30'),
        responsible: 'João (Produtor)',
        expectedResult: 'Visibilidade completa do caixa da propriedade',
        status: 'NAO_INICIADO',
      },
      {
        clientId: fazenda.id,
        consultorId: ana.id,
        diagnosticoAgroId: diagAgro.id,
        area: 'Seguros',
        action: 'Contratar seguro agrícola soja 24/25',
        objective: 'Proteção contra risco climático',
        priority: 'ALTA',
        deadline: new Date('2024-06-01'),
        responsible: 'Ana Paula',
        expectedResult: 'Cobertura de 70% da produção',
        status: 'CONCLUIDO',
      },
      {
        clientId: comercio.id,
        consultorId: carlos.id,
        diagnosticoPJId: diagPJ.id,
        area: 'Financeiro',
        action: 'Implantar controle financeiro semanal',
        objective: 'Eliminar vazamentos de caixa',
        priority: 'IMEDIATA',
        deadline: new Date('2024-06-20'),
        responsible: 'Carlos Mendes',
        expectedResult: 'Redução de 10% nas despesas não planejadas',
        status: 'EM_ANDAMENTO',
      },
    ]
  })

  // ── Operações de Crédito ──────────────────────────────────────
  await prisma.creditOperation.createMany({
    data: [
      {
        clientId: fazenda.id,
        bank: 'Sicoob',
        creditLine: 'PRONAMP Custeio',
        value: 1200000,
        rate: 12,
        termMonths: 12,
        guarantees: 'CPR + Penhor de safra',
        status: 'CONTRATADO',
      },
      {
        clientId: fazenda.id,
        bank: 'BB',
        creditLine: 'MODERFROTA',
        value: 800000,
        rate: 8.5,
        termMonths: 60,
        guarantees: 'Alienação de maquinário',
        status: 'CONTRATADO',
      },
      {
        clientId: agropec.id,
        bank: 'Bradesco',
        creditLine: 'FCO Rural',
        value: 3500000,
        rate: 7.5,
        termMonths: 84,
        guarantees: 'Hipoteca de imóvel rural',
        status: 'APROVADO',
      },
    ]
  })

  console.log('✅ Seed concluído com sucesso!')
  console.log('')
  console.log('📋 Contas criadas:')
  console.log('   Admin:      ana@afgestao.com.br      / admin123')
  console.log('   Consultor:  carlos@afgestao.com.br   / consultor123')
  console.log('   Cli. Rural: joao@fazendaspecro.com.br / cliente123')
  console.log('   Cli. PJ:    financeiro@comercioexpresso.com.br / cliente123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
