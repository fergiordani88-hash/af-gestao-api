import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

const clientSchema = z.object({
  name:          z.string().min(2),
  document:      z.string().min(11),
  phone:         z.string(),
  email:         z.string().email(),
  city:          z.string(),
  state:         z.string().default('MT'),
  address:       z.string().optional(),
  segment:       z.enum(['AGRO', 'COMERCIO', 'SERVICOS', 'INDUSTRIA']),
  size:          z.enum(['MICRO', 'PEQUENA', 'MEDIA', 'GRANDE']).default('MEDIA'),
  revenue:       z.number().default(0),
  status:        z.enum(['LEAD', 'PROPOSTA', 'NEGOCIACAO', 'ATIVO', 'INATIVO']).default('LEAD'),
  notes:         z.string().optional(),
  responsibleId: z.string(),
})

// GET /clients — lista todos (admin/consultor)
router.get('/', requireRole('ADMIN', 'CONSULTOR'), async (req: Request, res: Response) => {
  const { status, segment, search } = req.query

  const clients = await prisma.client.findMany({
    where: {
      ...(status   && { status:  String(status).toUpperCase() }),
      ...(segment  && { segment: String(segment).toUpperCase() }),
      ...(search   && {
        OR: [
          { name:  { contains: String(search) } },
          { email: { contains: String(search) } },
          { document: { contains: String(search) } },
        ]
      }),
    },
    include: {
      responsible: { select: { id: true, name: true } },
      contracts:   { select: { id: true, plan: true, monthlyValue: true, status: true } },
      _count:      { select: { actionPlans: true, diagnosticosPJ: true, diagnosticosAgro: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return res.json(clients.map(c => ({
    ...c,
    segment:  c.segment.toLowerCase(),
    status:   c.status.toLowerCase(),
    size:     c.size.toLowerCase(),
  })))
})

// GET /clients/stats — KPIs do dashboard
router.get('/stats', requireRole('ADMIN', 'CONSULTOR'), async (req: Request, res: Response) => {
  const [total, active, leads, inNegotiation, contracts] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: 'ATIVO' } }),
    prisma.client.count({ where: { status: 'LEAD' } }),
    prisma.client.count({ where: { status: { in: ['PROPOSTA', 'NEGOCIACAO'] } } }),
    prisma.contract.findMany({ where: { status: 'ATIVO' }, select: { monthlyValue: true } }),
  ])

  const monthlyRevenue = contracts.reduce((s, c) => s + c.monthlyValue, 0)
  const conversionRate = total > 0 ? Math.round((active / total) * 100) : 0

  return res.json({ total, active, leads, inNegotiation, monthlyRevenue, conversionRate })
})

// GET /clients/:id
router.get('/:id', async (req: Request, res: Response) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      responsible:     { select: { id: true, name: true, email: true } },
      contracts:       true,
      attendances:     { orderBy: { date: 'desc' }, take: 10 },
      actionPlans:     { orderBy: { priority: 'asc' } },
      creditOps:       true,
      diagnosticosPJ:  { orderBy: { createdAt: 'desc' }, take: 5 },
      diagnosticosAgro:{ orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })

  if (!client) return res.status(404).json({ error: 'Cliente não encontrado.' })

  // Clientes só veem o próprio perfil
  if (['CLIENTE_EMPRESA', 'CLIENTE_RURAL'].includes(req.user!.role)) {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (user?.email !== client.email) {
      return res.status(403).json({ error: 'Acesso não autorizado.' })
    }
  }

  return res.json({
    ...client,
    segment: client.segment.toLowerCase(),
    status:  client.status.toLowerCase(),
    size:    client.size.toLowerCase(),
  })
})

// POST /clients
router.post('/', requireRole('ADMIN', 'CONSULTOR'), async (req: Request, res: Response) => {
  const parsed = clientSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }

  const existing = await prisma.client.findUnique({ where: { document: parsed.data.document } })
  if (existing) return res.status(409).json({ error: 'Já existe um cliente com este CPF/CNPJ.' })

  const client = await prisma.client.create({
    data: {
      ...parsed.data,
      segment: parsed.data.segment,
      status:  parsed.data.status,
      size:    parsed.data.size,
    },
    include: { responsible: { select: { id: true, name: true } } },
  })

  return res.status(201).json({ ...client, segment: client.segment.toLowerCase(), status: client.status.toLowerCase() })
})

// PATCH /clients/:id
router.patch('/:id', requireRole('ADMIN', 'CONSULTOR'), async (req: Request, res: Response) => {
  const exists = await prisma.client.findUnique({ where: { id: req.params.id } })
  if (!exists) return res.status(404).json({ error: 'Cliente não encontrado.' })

  const data: Record<string, unknown> = {}
  const allowed = ['name','phone','email','city','state','address','segment','size','revenue','status','notes','responsibleId']
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      data[key] = ['segment','size','status'].includes(key)
        ? String(req.body[key]).toUpperCase()
        : req.body[key]
    }
  }

  const client = await prisma.client.update({ where: { id: req.params.id }, data })
  return res.json({ ...client, segment: client.segment.toLowerCase(), status: client.status.toLowerCase() })
})

// DELETE /clients/:id
router.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  await prisma.client.delete({ where: { id: req.params.id } })
  return res.status(204).send()
})

// POST /clients/:id/attendances
router.post('/:id/attendances', requireRole('ADMIN', 'CONSULTOR'), async (req: Request, res: Response) => {
  const { date, type, summary, nextSteps } = req.body
  const att = await prisma.attendance.create({
    data: {
      clientId:  req.params.id,
      date:      new Date(date),
      type:      String(type).toUpperCase(),
      summary,
      nextSteps,
    }
  })
  return res.status(201).json(att)
})

export default router
