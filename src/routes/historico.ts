// Histórico de indicadores PJ + Agro + DRE Rural + Inadimplência
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// ── Helpers ────────────────────────────────────────────────
function calcInd(d: {
  receitaBruta: number; cmv: number; despesasFixas: number; folha: number
  proLabore: number; tributos: number; despesasFinanceiras: number; parcela: number
  caixa: number; aReceber: number; estoque: number; aFornecedores: number; dividaTotal: number; dividaCP: number
}) {
  const lucBruto   = d.receitaBruta - d.cmv
  const despOp     = d.despesasFixas + d.folha + d.proLabore
  const ebitda     = lucBruto - despOp
  const lucLiq     = ebitda - d.tributos - d.despesasFinanceiras
  const amort      = Math.max(0, d.parcela - d.despesasFinanceiras)
  const sobraCaixa = lucLiq - amort
  const margBruta  = d.receitaBruta > 0 ? lucBruto / d.receitaBruta : 0
  const margEbitda = d.receitaBruta > 0 ? ebitda / d.receitaBruta : 0
  const margLiq    = d.receitaBruta > 0 ? lucLiq / d.receitaBruta : 0
  const liquidezC  = d.aFornecedores > 0 ? (d.caixa + d.aReceber + d.estoque) / d.aFornecedores : 99
  const cobDivida  = d.parcela > 0 ? ebitda / d.parcela : 0
  const ncg        = d.aReceber + d.estoque - d.aFornecedores
  const peBS       = margBruta > 0 ? despOp / margBruta : 0

  const pts = [
    margLiq >= 0.05 ? 2 : margLiq > 0 ? 1 : 0,
    liquidezC >= 1.5 ? 2 : liquidezC >= 1.2 ? 1 : 0,
    cobDivida >= 2 ? 2 : cobDivida >= 1 ? 1 : 0,
    sobraCaixa > 0 ? 2 : 1,
  ].reduce((a, b) => a + b, 0)

  return {
    lucBruto, ebitda, lucLiq, sobraCaixa, margBruta, margEbitda, margLiq,
    liquidezC, cobDivida, ncg, peBS,
    classificacao: pts >= 7 ? 'saudavel' : pts >= 5 ? 'atencao' : pts >= 3 ? 'critico' : 'reestruturacao',
  }
}

// ─────────────────────────────────────────────
// PJ: HISTÓRICO DE INDICADORES
// ─────────────────────────────────────────────

// Salva snapshot do mês atual
router.post('/pj/snapshot', async (req: Request, res: Response) => {
  const d = req.body
  const agora = new Date()
  const ano   = Number(d.ano  ?? agora.getFullYear())
  const mes   = Number(d.mes  ?? agora.getMonth() + 1)
  const periodo = `${ano}-${String(mes).padStart(2, '0')}`

  const ind = calcInd(d)

  const data = {
    clientId: d.clientId, periodo, ano, mes,
    receitaBruta: d.receitaBruta ?? 0, cmv: d.cmv ?? 0,
    despesasFixas: d.despesasFixas ?? 0, folha: d.folha ?? 0,
    proLabore: d.proLabore ?? 0, tributos: d.tributos ?? 0,
    despesasFinanceiras: d.despesasFinanceiras ?? 0, parcela: d.parcela ?? 0,
    caixa: d.caixa ?? 0, aReceber: d.aReceber ?? 0,
    estoque: d.estoque ?? 0, dividaTotal: d.dividaTotal ?? 0,
    ...ind,
  }

  const snap = await prisma.pJHistoricoIndicadores.upsert({
    where: { clientId_periodo: { clientId: d.clientId, periodo } },
    create: data, update: data,
  })
  res.json(snap)
})

// Histórico completo do cliente
router.get('/pj/historico/:clientId', async (req: Request, res: Response) => {
  const snaps = await prisma.pJHistoricoIndicadores.findMany({
    where: { clientId: req.params.clientId },
    orderBy: [{ ano: 'asc' }, { mes: 'asc' }],
  })

  // Calcula variação em relação ao período anterior
  const comVariacao = snaps.map((s, i) => {
    const prev = snaps[i - 1]
    return {
      ...s,
      varReceitaBruta: prev && prev.receitaBruta > 0 ? ((s.receitaBruta - prev.receitaBruta) / prev.receitaBruta) * 100 : null,
      varMargLiq:      prev ? s.margLiq - prev.margLiq : null,
      varEbitda:       prev && prev.ebitda !== 0 ? ((s.ebitda - prev.ebitda) / Math.abs(prev.ebitda)) * 100 : null,
      varLiquidezC:    prev ? s.liquidezC - prev.liquidezC : null,
    }
  })

  res.json(comVariacao)
})

// Comparativo: mês atual vs mês anterior vs mesmo mês do ano passado
router.get('/pj/comparativo/:clientId', async (req: Request, res: Response) => {
  const snaps = await prisma.pJHistoricoIndicadores.findMany({
    where: { clientId: req.params.clientId },
    orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
    take: 24,
  })

  if (snaps.length === 0) return res.json(null)

  const atual = snaps[0]
  const anterior = snaps[1] ?? null
  const mesmoMesAnoPassado = snaps.find(
    s => s.mes === atual.mes && s.ano === atual.ano - 1
  ) ?? null

  res.json({
    atual,
    anterior,
    mesmoMesAnoPassado,
    evolucao12meses: snaps.slice(0, 12).reverse(),
  })
})

// ─────────────────────────────────────────────
// PJ: INADIMPLÊNCIA (aging da carteira)
// ─────────────────────────────────────────────
router.get('/pj/inadimplencia/:clientId', async (req: Request, res: Response) => {
  const items = await prisma.pJInadimplencia.findMany({
    where: { clientId: req.params.clientId },
    orderBy: { dataVenc: 'asc' },
  })

  const hoje = new Date()
  const comAging = items.map(i => {
    const dias = Math.floor((hoje.getTime() - new Date(i.dataVenc).getTime()) / 86400000)
    const faixa =
      dias <= 0   ? 'a_vencer' :
      dias <= 30  ? '1_30' :
      dias <= 60  ? '31_60' :
      dias <= 90  ? '61_90' :
      dias <= 120 ? '91_120' : 'acima_120'
    return { ...i, diasAtraso: Math.max(0, dias), faixa }
  })

  // Resumo por faixa
  const faixas = ['a_vencer', '1_30', '31_60', '61_90', '91_120', 'acima_120']
  const resumo = faixas.map(f => ({
    faixa:    f,
    total:    comAging.filter(i => i.faixa === f).reduce((s, i) => s + i.valor, 0),
    qtd:      comAging.filter(i => i.faixa === f).length,
    risco:    f === 'a_vencer' ? 'Nenhum' : f === '1_30' ? 'Baixo' : f === '31_60' ? 'Moderado' : 'Alto',
  }))

  const totalCarteira   = items.reduce((s, i) => s + i.valor, 0)
  const totalVencido    = comAging.filter(i => i.faixa !== 'a_vencer').reduce((s, i) => s + i.valor, 0)
  const taxaInadimpl    = totalCarteira > 0 ? totalVencido / totalCarteira : 0

  res.json({ items: comAging, resumo, totalCarteira, totalVencido, taxaInadimpl })
})

router.post('/pj/inadimplencia', async (req: Request, res: Response) => {
  const d = req.body
  const item = await prisma.pJInadimplencia.create({
    data: { ...d, dataVenc: new Date(d.dataVenc), diasAtraso: 0 },
  })
  res.status(201).json(item)
})

router.patch('/pj/inadimplencia/:id', async (req: Request, res: Response) => {
  const item = await prisma.pJInadimplencia.update({ where: { id: req.params.id }, data: req.body })
  res.json(item)
})

router.delete('/pj/inadimplencia/:id', async (req: Request, res: Response) => {
  await prisma.pJInadimplencia.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// ─────────────────────────────────────────────
// AGRO: DRE RURAL FORMAL
// ─────────────────────────────────────────────
function calcDRERural(d: any) {
  // Receitas
  const recSoja   = (d.recSojaVolume ?? 0) * (d.recSojaPreco ?? 0)
  const recMilho  = (d.recMilhoVolume ?? 0) * (d.recMilhoPreco ?? 0)
  const recFeijao = (d.recFeijaoVolume ?? 0) * (d.recFeijaoPreco ?? 0)
  const recBruta  = recSoja + recMilho + recFeijao + (d.recOutras ?? 0)

  // Custo da atividade — usa total direto se preenchido, senão calcula via per-ha (dados legados)
  const area      = d.totalAreaCusteada ?? 0
  const custoAtivPerHa = area * (
    (d.custoSementesHa ?? 0) + (d.custoFertilizHa ?? 0) +
    (d.custoDefensivosHa ?? 0) + (d.custoDieselHa ?? 0) +
    (d.custoServicosHa ?? 0) + (d.custoOutrosHa ?? 0)
  )
  const custoAtiv = (d.custoAtivTotal ?? 0) > 0 ? (d.custoAtivTotal ?? 0) : custoAtivPerHa

  // Arrendamento
  const arrendamento = (d.areaArrendada ?? 0) * (d.arrendamentoHa ?? 0)

  // Lucro bruto da atividade
  const lucBruto  = recBruta - custoAtiv - arrendamento
  const margBruta = recBruta > 0 ? lucBruto / recBruta : 0

  // Despesas administrativas
  const despAdmin = (d.folha ?? 0) + (d.proLabore ?? 0) + (d.contabilidade ?? 0) +
    (d.energia ?? 0) + (d.internet ?? 0) + (d.manutencaoVeic ?? 0) +
    (d.seguros ?? 0) + (d.outrasAdmin ?? 0)

  // EBITDA Rural
  const ebitda    = lucBruto - despAdmin
  const margEbitda = recBruta > 0 ? ebitda / recBruta : 0

  // Resultado financeiro
  const despFin   = d.despFinanceiras ?? 0
  const amort     = d.amortizacoes ?? 0
  const depreciacao = d.depreciacao ?? 0

  // EBITDA - Dep. Financeiras
  const ebit      = ebitda - depreciacao
  const lucLiq    = ebit - despFin
  const sobraCaixa = lucLiq - amort  // geração livre de caixa (paga juros + amortização)

  const margLiq   = recBruta > 0 ? lucLiq / recBruta : 0
  const custoPorHaTotal = area > 0 ? (custoAtiv + arrendamento + despAdmin) / area : 0
  const peVolumeTotal   = d.recSojaPreco > 0
    ? (custoAtiv + arrendamento + despAdmin) / d.recSojaPreco : 0

  return {
    recSoja, recMilho, recFeijao, recBruta, custoAtiv, arrendamento,
    lucBruto, margBruta, despAdmin, ebitda, margEbitda,
    depreciacao, ebit, despFin, amort, lucLiq, sobraCaixa,
    margLiq, custoPorHaTotal, peVolumeTotal,
    classificacao: sobraCaixa > 0 && margBruta > 0.10 ? 'saudavel' :
      lucLiq > 0 ? 'atencao' : ebitda > 0 ? 'critico' : 'reestruturacao',
  }
}

router.get('/agro/dre-rural/:clientId', async (req: Request, res: Response) => {
  const { safra } = req.query
  const dres = await prisma.agroDRERural.findMany({
    where: {
      clientId: req.params.clientId,
      ...(safra && { safra: String(safra) }),
    },
    orderBy: { safra: 'desc' },
  })
  const comCalc = dres.map(d => ({ ...d, calculado: calcDRERural(d) }))
  res.json(comCalc)
})

router.get('/agro/dre-rural/:clientId/:safra', async (req: Request, res: Response) => {
  const dre = await prisma.agroDRERural.findUnique({
    where: { clientId_safra: { clientId: req.params.clientId, safra: req.params.safra } },
  })
  if (!dre) return res.json(null)
  res.json({ ...dre, calculado: calcDRERural(dre) })
})

router.post('/agro/dre-rural', async (req: Request, res: Response) => {
  const d = req.body
  const dre = await prisma.agroDRERural.upsert({
    where: { clientId_safra: { clientId: d.clientId, safra: d.safra } },
    create: d, update: d,
  })
  res.json({ ...dre, calculado: calcDRERural(dre) })
})

// ─────────────────────────────────────────────
// AGRO: HISTÓRICO DE SAFRAS
// ─────────────────────────────────────────────
router.post('/agro/historico-safra', async (req: Request, res: Response) => {
  const d = req.body
  const snap = await prisma.agroHistoricoSafra.upsert({
    where: { clientId_safra: { clientId: d.clientId, safra: d.safra } },
    create: d, update: d,
  })
  res.json(snap)
})

router.get('/agro/historico-safra/:clientId', async (req: Request, res: Response) => {
  const safras = await prisma.agroHistoricoSafra.findMany({
    where: { clientId: req.params.clientId },
    orderBy: { safra: 'asc' },
  })

  // Calcula variação entre safras
  const comVariacao = safras.map((s, i) => {
    const prev = safras[i - 1]
    return {
      ...s,
      varReceita:    prev && prev.totalReceita > 0 ? ((s.totalReceita - prev.totalReceita) / prev.totalReceita) * 100 : null,
      varMargem:     prev ? s.margem - prev.margem : null,
      varResultadoHa:prev && prev.resultadoHa !== 0 ? ((s.resultadoHa - prev.resultadoHa) / Math.abs(prev.resultadoHa)) * 100 : null,
    }
  })

  res.json(comVariacao)
})

// ─────────────────────────────────────────────
// PJ: CICLO OPERACIONAL (dados complementares)
// ─────────────────────────────────────────────
router.post('/pj/ciclo-operacional', async (req: Request, res: Response) => {
  const { pmre, pmr, pmp, receitaBruta, cmv, estoque, aReceber, aFornecedores } = req.body

  // PMRE calculado (se não informado)
  const pmreCalc = pmre ?? (cmv > 0 ? (estoque / cmv) * 30 : 0)
  // PMR calculado (se não informado)
  const pmrCalc  = pmr  ?? (receitaBruta > 0 ? (aReceber / receitaBruta) * 30 : 0)
  // PMP calculado (se não informado)
  const pmpCalc  = pmp  ?? (cmv > 0 ? (aFornecedores / cmv) * 30 : 0)

  const cicloOperacional = pmreCalc + pmrCalc
  const cicloFinanceiro  = cicloOperacional - pmpCalc
  const ncg = aReceber + estoque - aFornecedores
  const ncgDiaria = receitaBruta > 0 ? ncg / 30 : 0

  // Diagnóstico
  const diagCiclo = cicloFinanceiro <= 15 ? 'Eficiente — capital de giro bem gerido'
    : cicloFinanceiro <= 30 ? 'Adequado — monitorar crescimento de prazo'
    : cicloFinanceiro <= 60 ? 'Atenção — empresa financiando clientes com capital próprio'
    : 'Crítico — ciclo muito longo, alto consumo de caixa'

  res.json({
    pmre: pmreCalc, pmr: pmrCalc, pmp: pmpCalc,
    cicloOperacional, cicloFinanceiro, ncg, ncgDiaria,
    diagCiclo,
    benchmark: { pmr: { ideal: '15-30 dias' }, pmp: { ideal: '45-60 dias' }, cicloFinanceiro: { ideal: '< 30 dias' } },
  })
})

export default router
