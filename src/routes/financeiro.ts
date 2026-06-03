import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// GET /financeiro/cashflow/:clientId
router.get('/cashflow/:clientId', async (req: Request, res: Response) => {
  const { year } = req.query
  const entries = await prisma.cashFlow.findMany({
    where: {
      clientId: req.params.clientId,
      ...(year && { year: Number(year) }),
    },
    orderBy: [{ year: 'asc' }, { month: 'asc' }, { dueDate: 'asc' }],
  })

  // Agrupar por mês
  const byMonth: Record<string, { month: string; entradas: number; saidas: number; saldo: number }> = {}
  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  for (const e of entries) {
    const key = `${e.year}-${String(e.month).padStart(2,'0')}`
    if (!byMonth[key]) {
      byMonth[key] = { month: monthNames[e.month - 1], entradas: 0, saidas: 0, saldo: 0 }
    }
    if (e.type === 'ENTRADA') byMonth[key].entradas += e.value
    else                      byMonth[key].saidas   += e.value
  }

  const monthly = Object.values(byMonth).map(m => ({
    ...m, saldo: m.entradas - m.saidas
  }))

  const totalInflow  = monthly.reduce((s, m) => s + m.entradas, 0)
  const totalOutflow = monthly.reduce((s, m) => s + m.saidas, 0)
  const criticalMonths = monthly.filter(m => m.saldo < 0).map(m => m.month)

  return res.json({ monthly, totalInflow, totalOutflow, netBalance: totalInflow - totalOutflow, criticalMonths })
})

// POST /financeiro/cashflow
router.post('/cashflow', async (req: Request, res: Response) => {
  const { clientId, year, month, type, category, description, value, dueDate } = req.body

  const entry = await prisma.cashFlow.create({
    data: {
      clientId,
      year:   Number(year),
      month:  Number(month),
      type:   String(type).toUpperCase(),
      category,
      description,
      value:  Number(value),
      dueDate: new Date(dueDate),
      status: 'PENDENTE',
    }
  })

  return res.status(201).json(entry)
})

// GET /financeiro/credito/:clientId
router.get('/credito/:clientId', async (req: Request, res: Response) => {
  const ops = await prisma.creditOperation.findMany({
    where: { clientId: req.params.clientId },
    orderBy: { createdAt: 'desc' },
  })
  return res.json(ops)
})

// POST /financeiro/credito
router.post('/credito', async (req: Request, res: Response) => {
  const { clientId, bank, creditLine, value, rate, termMonths, guarantees, startDate } = req.body

  const op = await prisma.creditOperation.create({
    data: {
      clientId,
      bank,
      creditLine,
      value:      Number(value),
      rate:       Number(rate),
      termMonths: Number(termMonths),
      guarantees,
      startDate:  startDate ? new Date(startDate) : undefined,
      status:     'ANALISE',
    }
  })

  return res.status(201).json(op)
})

// PATCH /financeiro/credito/:id
router.patch('/credito/:id', async (req: Request, res: Response) => {
  const op = await prisma.creditOperation.update({
    where: { id: req.params.id },
    data:  req.body,
  })
  return res.json(op)
})

export default router
