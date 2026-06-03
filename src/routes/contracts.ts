import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// GET /contracts
router.get('/', requireRole('ADMIN', 'CONSULTOR'), async (req: Request, res: Response) => {
  const { clientId, status } = req.query
  const contracts = await prisma.contract.findMany({
    where: {
      ...(clientId && { clientId: String(clientId) }),
      ...(status && { status: String(status).toUpperCase() }),
    },
    include: { client: { select: { id: true, name: true, segment: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return res.json(contracts)
})

// POST /contracts
router.post('/', requireRole('ADMIN', 'CONSULTOR'), async (req: Request, res: Response) => {
  const { clientId, plan, description, monthlyValue, setupFee, startDate, renewalDate } = req.body

  const contract = await prisma.contract.create({
    data: {
      clientId,
      plan,
      description,
      monthlyValue: Number(monthlyValue),
      setupFee:     setupFee ? Number(setupFee) : undefined,
      startDate:    new Date(startDate),
      renewalDate:  new Date(renewalDate),
      status:       'ATIVO',
    },
    include: { client: { select: { id: true, name: true } } },
  })

  return res.status(201).json(contract)
})

// PATCH /contracts/:id
router.patch('/:id', requireRole('ADMIN', 'CONSULTOR'), async (req: Request, res: Response) => {
  const contract = await prisma.contract.update({
    where: { id: req.params.id },
    data: req.body,
  })
  return res.json(contract)
})

export default router
