import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()
router.use(requireAuth, requireRole('ADMIN', 'CONSULTOR'))

// GET /dashboard — todos os KPIs em uma única chamada
router.get('/', async (_req: Request, res: Response) => {
  const [
    totalClients, activeClients, leadsCount, negotiatingCount,
    activeContracts, recentClients, actionPlanStats,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: 'ATIVO' } }),
    prisma.client.count({ where: { status: 'LEAD' } }),
    prisma.client.count({ where: { status: { in: ['PROPOSTA', 'NEGOCIACAO'] } } }),
    prisma.contract.findMany({ where: { status: 'ATIVO' }, select: { monthlyValue: true } }),
    prisma.client.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, segment: true, status: true, city: true, createdAt: true },
    }),
    prisma.actionPlan.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
  ])

  const monthlyRevenue = activeContracts.reduce((s, c) => s + c.monthlyValue, 0)
  const annualRevenue  = monthlyRevenue * 12
  const conversionRate = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0

  // Distribuição por segmento
  const segmentRaw = await prisma.client.groupBy({ by: ['segment'], _count: { segment: true } })
  const bySegment  = Object.fromEntries(segmentRaw.map(r => [r.segment.toLowerCase(), r._count.segment]))

  // Pipeline
  const pipeline = await prisma.client.groupBy({ by: ['status'], _count: { status: true } })
  const byStatus  = Object.fromEntries(pipeline.map(r => [r.status.toLowerCase(), r._count.status]))

  const actionsByStatus = Object.fromEntries(actionPlanStats.map(r => [r.status.toLowerCase(), r._count.status]))

  return res.json({
    kpis: { totalClients, activeClients, leadsCount, negotiatingCount, monthlyRevenue, annualRevenue, conversionRate },
    bySegment,
    byStatus,
    recentClients: recentClients.map(c => ({ ...c, segment: c.segment.toLowerCase(), status: c.status.toLowerCase() })),
    actionsByStatus,
  })
})

export default router
