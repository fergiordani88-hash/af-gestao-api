import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()
router.use(requireAuth, requireRole('ADMIN', 'CONSULTOR'))

// ── Diagnóstico PJ ──────────────────────────────────────────────

function calcDRE(d: {
  grossRevenue: number; deductions: number; cmv: number
  fixedExpenses: number; variableExpenses: number; financialExpenses: number; proLabore: number
  totalDebt: number; grossRevenue: number
}) {
  const net        = d.grossRevenue - d.deductions
  const grossProfit = net - d.cmv
  const ebitda     = grossProfit - d.fixedExpenses - d.variableExpenses - d.proLabore
  const result     = ebitda - d.financialExpenses
  const grossMargin = net > 0 ? (grossProfit / net) * 100 : 0
  const netMargin   = d.grossRevenue > 0 ? (result / d.grossRevenue) * 100 : 0
  const breakeven   = grossMargin > 0 ? ((d.fixedExpenses + d.proLabore) / (grossMargin / 100)) : 0
  const debtRatio   = d.grossRevenue > 0 ? (d.totalDebt / d.grossRevenue) * 100 : 0

  let classification = 'REESTRUTURACAO'
  if (netMargin >= 10 && debtRatio < 30)       classification = 'SAUDAVEL'
  else if (netMargin >= 5 && debtRatio < 60)   classification = 'ATENCAO'
  else if (netMargin >= 0 && debtRatio < 100)  classification = 'CRITICO'

  return { ebitda, grossMargin, netMargin, breakeven, classification }
}

// GET /diagnosticos/pj
router.get('/pj', async (req: Request, res: Response) => {
  const { clientId } = req.query
  const items = await prisma.diagnosticoPJ.findMany({
    where: clientId ? { clientId: String(clientId) } : {},
    include: { client: { select: { id: true, name: true } }, consultor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return res.json(items)
})

// GET /diagnosticos/pj/:id
router.get('/pj/:id', async (req: Request, res: Response) => {
  const d = await prisma.diagnosticoPJ.findUnique({
    where: { id: req.params.id },
    include: {
      client:     { select: { id: true, name: true, segment: true, city: true } },
      consultor:  { select: { id: true, name: true } },
      actionPlans:{ orderBy: { priority: 'asc' } },
      documents:  true,
    }
  })
  if (!d) return res.status(404).json({ error: 'Diagnóstico não encontrado.' })
  return res.json(d)
})

// POST /diagnosticos/pj
router.post('/pj', async (req: Request, res: Response) => {
  const data = req.body
  const calc = calcDRE(data)

  const diag = await prisma.diagnosticoPJ.create({
    data: {
      clientId:         data.clientId,
      consultorId:      req.user!.userId,
      period:           data.period ?? new Date().getFullYear().toString(),
      segment:          data.segment,
      employees:        data.employees ? Number(data.employees) : undefined,
      grossRevenue:     Number(data.grossRevenue),
      deductions:       Number(data.deductions ?? 0),
      cmv:              Number(data.cmv ?? 0),
      fixedExpenses:    Number(data.fixedExpenses ?? 0),
      variableExpenses: Number(data.variableExpenses ?? 0),
      financialExpenses:Number(data.financialExpenses ?? 0),
      proLabore:        Number(data.proLabore ?? 0),
      totalDebt:        Number(data.totalDebt ?? 0),
      shortTermDebt:    Number(data.shortTermDebt ?? 0),
      bankName:         data.bankName,
      hasAccounting:    Boolean(data.hasAccounting),
      hasERP:           Boolean(data.hasERP),
      hasFinancialControl: Boolean(data.hasFinancialControl),
      ...calc,
    },
    include: { client: { select: { id: true, name: true } } }
  })

  return res.status(201).json(diag)
})

// PATCH /diagnosticos/pj/:id
router.patch('/pj/:id', async (req: Request, res: Response) => {
  const exists = await prisma.diagnosticoPJ.findUnique({ where: { id: req.params.id } })
  if (!exists) return res.status(404).json({ error: 'Diagnóstico não encontrado.' })

  const updated = await prisma.diagnosticoPJ.update({
    where: { id: req.params.id },
    data: req.body,
  })
  return res.json(updated)
})

// ── Diagnóstico Agro ────────────────────────────────────────────

function calcAgro(data: Record<string, unknown>) {
  const cultures = JSON.parse(String(data.cultures ?? '[]')) as Array<{
    area: number; productivity: number; price: number; costHa: number; culture: string
  }>

  let totalRevenue = 0, totalCost = 0
  for (const c of cultures) {
    totalRevenue += c.area * c.productivity * c.price
    totalCost    += c.area * c.costHa
  }
  const leasedArea   = Number(data.leasedArea ?? 0)
  const leaseValueHa = Number(data.leaseValueHa ?? 0)
  totalCost += leasedArea * leaseValueHa

  const totalArea  = Number(data.ownArea ?? 0) + leasedArea
  const margin     = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
  const revenueHa  = totalArea > 0 ? totalRevenue / totalArea : 0
  const totalDebt  = Number(data.custeioValue ?? 0) + Number(data.investValue ?? 0) + Number(data.cprValue ?? 0)
  const patrimony  = Number(data.propertyValue ?? 0) + Number(data.machineryValue ?? 0)
  const debtRatio  = patrimony > 0 ? (totalDebt / patrimony) * 100 : 0

  let classification = 'REESTRUTURACAO'
  if (margin >= 20 && debtRatio < 40)      classification = 'SAUDAVEL'
  else if (margin >= 10 && debtRatio < 70) classification = 'ATENCAO'
  else if (margin >= 0)                    classification = 'CRITICO'

  return { totalRevenue, totalCost, margin, revenueHa, classification }
}

// GET /diagnosticos/agro
router.get('/agro', async (req: Request, res: Response) => {
  const { clientId } = req.query
  const items = await prisma.diagnosticoAgro.findMany({
    where: clientId ? { clientId: String(clientId) } : {},
    include: { client: { select: { id: true, name: true } }, consultor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return res.json(items)
})

// GET /diagnosticos/agro/:id
router.get('/agro/:id', async (req: Request, res: Response) => {
  const d = await prisma.diagnosticoAgro.findUnique({
    where: { id: req.params.id },
    include: {
      client:     { select: { id: true, name: true, city: true, state: true } },
      consultor:  { select: { id: true, name: true } },
      actionPlans:{ orderBy: { priority: 'asc' } },
      documents:  true,
    }
  })
  if (!d) return res.status(404).json({ error: 'Diagnóstico não encontrado.' })
  return res.json(d)
})

// POST /diagnosticos/agro
router.post('/agro', async (req: Request, res: Response) => {
  const data = req.body
  const calc = calcAgro(data)

  const diag = await prisma.diagnosticoAgro.create({
    data: {
      clientId:        data.clientId,
      consultorId:     req.user!.userId,
      season:          data.season ?? '2024/2025',
      ownArea:         Number(data.ownArea ?? 0),
      leasedArea:      Number(data.leasedArea ?? 0),
      leaseValueHa:    Number(data.leaseValueHa ?? 0),
      cultures:        typeof data.cultures === 'string' ? data.cultures : JSON.stringify(data.cultures ?? []),
      custeioValue:    Number(data.custeioValue ?? 0),
      custeioBank:     data.custeioBank,
      custeioRate:     Number(data.custeioRate ?? 0),
      investValue:     Number(data.investValue ?? 0),
      investBank:      data.investBank,
      investRate:      Number(data.investRate ?? 0),
      cprValue:        Number(data.cprValue ?? 0),
      cprBank:         data.cprBank,
      propertyValue:   Number(data.propertyValue ?? 0),
      machineryValue:  Number(data.machineryValue ?? 0),
      hasInsurance:    Boolean(data.hasInsurance),
      hasPlanning:     Boolean(data.hasPlanning),
      hasFinancialCtrl:Boolean(data.hasFinancialCtrl),
      ...calc,
    },
    include: { client: { select: { id: true, name: true } } }
  })

  return res.status(201).json(diag)
})

export default router
