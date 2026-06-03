import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// ── Questionário PJ ───────────────────────────────────────────
router.get('/pj/:clientId', async (req: Request, res: Response) => {
  const q = await prisma.questionarioPJ.findUnique({ where: { clientId: req.params.clientId } })
  res.json(q)
})

router.post('/pj', async (req: Request, res: Response) => {
  const { clientId, ...data } = req.body
  const q = await prisma.questionarioPJ.upsert({
    where: { clientId },
    create: { clientId, ...data, dataUltimaEdicao: new Date() },
    update: { ...data, dataUltimaEdicao: new Date() },
  })
  res.json(q)
})

// Salva seção específica
router.patch('/pj/:clientId/secao/:secao', async (req: Request, res: Response) => {
  const { clientId, secao } = req.params
  const data = { [secao]: JSON.stringify(req.body.respostas), dataUltimaEdicao: new Date() }
  if (req.body.percentualConclusao !== undefined) {
    (data as any).percentualConclusao = req.body.percentualConclusao
  }
  const q = await prisma.questionarioPJ.upsert({
    where:  { clientId },
    create: { clientId, ...data },
    update: data,
  })
  res.json(q)
})

// ── Questionário Agro ─────────────────────────────────────────
router.get('/agro/:clientId', async (req: Request, res: Response) => {
  const q = await prisma.questionarioAgro.findUnique({ where: { clientId: req.params.clientId } })
  res.json(q)
})

router.post('/agro', async (req: Request, res: Response) => {
  const { clientId, ...data } = req.body
  const q = await prisma.questionarioAgro.upsert({
    where: { clientId },
    create: { clientId, ...data, dataUltimaEdicao: new Date() },
    update: { ...data, dataUltimaEdicao: new Date() },
  })
  res.json(q)
})

router.patch('/agro/:clientId/secao/:secao', async (req: Request, res: Response) => {
  const { clientId, secao } = req.params
  const data = { [secao]: JSON.stringify(req.body.respostas), dataUltimaEdicao: new Date() }
  if (req.body.percentualConclusao !== undefined) {
    (data as any).percentualConclusao = req.body.percentualConclusao
  }
  const q = await prisma.questionarioAgro.upsert({
    where:  { clientId },
    create: { clientId, ...data },
    update: data,
  })
  res.json(q)
})

// ── Metas de indicadores ──────────────────────────────────────
router.get('/metas/:clientId', async (req: Request, res: Response) => {
  const metas = await prisma.meta.findMany({
    where: { clientId: req.params.clientId },
    orderBy: { prazo: 'asc' },
  })
  res.json(metas)
})

router.post('/metas', async (req: Request, res: Response) => {
  const meta = await prisma.meta.create({
    data: { ...req.body, prazo: new Date(req.body.prazo) },
  })
  res.status(201).json(meta)
})

router.patch('/metas/:id', async (req: Request, res: Response) => {
  const data = { ...req.body }
  if (data.prazo) data.prazo = new Date(data.prazo)
  const meta = await prisma.meta.update({ where: { id: req.params.id }, data })
  res.json(meta)
})

router.delete('/metas/:id', async (req: Request, res: Response) => {
  await prisma.meta.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// ── DRE Projetado ─────────────────────────────────────────────
router.get('/dre-projetado/:clientId/:ano', async (req: Request, res: Response) => {
  const meses = await prisma.pJDreProjetado.findMany({
    where: { clientId: req.params.clientId, ano: Number(req.params.ano) },
    orderBy: { mes: 'asc' },
  })
  res.json(meses)
})

router.post('/dre-projetado', async (req: Request, res: Response) => {
  const { clientId, ano, mes, ...data } = req.body
  const proj = await prisma.pJDreProjetado.upsert({
    where: { clientId_ano_mes: { clientId, ano: Number(ano), mes: Number(mes) } },
    create: { clientId, ano: Number(ano), mes: Number(mes), ...data },
    update: data,
  })
  res.json(proj)
})

// Comparativo projetado vs realizado
router.get('/dre-comparativo/:clientId/:ano', async (req: Request, res: Response) => {
  const [projetados, realizados] = await Promise.all([
    prisma.pJDreProjetado.findMany({
      where: { clientId: req.params.clientId, ano: Number(req.params.ano) },
      orderBy: { mes: 'asc' },
    }),
    prisma.pJHistoricoIndicadores.findMany({
      where: { clientId: req.params.clientId, ano: Number(req.params.ano) },
      orderBy: { mes: 'asc' },
    }),
  ])

  const meses = Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
    const p = projetados.find(x => x.mes === mes)
    const r = realizados.find(x => x.mes === mes)
    return {
      mes,
      projetado: p ?? null,
      realizado: r ?? null,
      varReceita: p && r && p.receitaBruta > 0 ? ((r.receitaBruta - p.receitaBruta) / p.receitaBruta) * 100 : null,
      varEbitda:  p && r && p.receitaBruta > 0 ? ((r.ebitda ?? 0) - (p.receitaBruta - p.cmv - p.despesasFixas - p.folha - p.proLabore)) : null,
    }
  })

  res.json(meses)
})

export default router
