import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// GET /action-plans
router.get('/', async (req: Request, res: Response) => {
  const { clientId, status } = req.query
  const plans = await prisma.actionPlan.findMany({
    where: {
      ...(clientId && { clientId: String(clientId) }),
      ...(status && { status: String(status).toUpperCase() }),
    },
    include: {
      client:    { select: { id: true, name: true } },
      consultor: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: 'asc' }, { deadline: 'asc' }],
  })
  return res.json(plans.map(p => ({
    ...p,
    priority: p.priority.toLowerCase(),
    status:   p.status.toLowerCase(),
  })))
})

// POST /action-plans
router.post('/', requireRole('ADMIN', 'CONSULTOR'), async (req: Request, res: Response) => {
  const { clientId, area, action, objective, priority, deadline, responsible, expectedResult, notes, diagnosticoPJId, diagnosticoAgroId } = req.body

  const plan = await prisma.actionPlan.create({
    data: {
      clientId,
      consultorId:       req.user!.userId,
      diagnosticoPJId,
      diagnosticoAgroId,
      area,
      action,
      objective,
      priority:          String(priority ?? 'MEDIA').toUpperCase(),
      deadline:          new Date(deadline),
      responsible,
      expectedResult,
      status:            'NAO_INICIADO',
      notes,
    }
  })

  return res.status(201).json({ ...plan, priority: plan.priority.toLowerCase(), status: plan.status.toLowerCase() })
})

// PATCH /action-plans/:id
router.patch('/:id', requireRole('ADMIN', 'CONSULTOR'), async (req: Request, res: Response) => {
  const data: Record<string, unknown> = { ...req.body }
  if (data.status)   data.status   = String(data.status).toUpperCase()
  if (data.priority) data.priority = String(data.priority).toUpperCase()
  if (data.deadline) data.deadline = new Date(String(data.deadline))

  const plan = await prisma.actionPlan.update({ where: { id: req.params.id }, data })
  return res.json({ ...plan, priority: plan.priority.toLowerCase(), status: plan.status.toLowerCase() })
})

export default router
