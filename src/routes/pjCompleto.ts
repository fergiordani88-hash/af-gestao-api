import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { getBenchmarkPJ, BENCHMARKS_AGRO } from '../lib/benchmarks'

const router = Router()
router.use(requireAuth)

// ── Helpers ───────────────────────────────────────────────────
function calcDRE(d: {
  receitaBruta: number; cmv: number; despesasFixas: number; folha: number
  proLabore: number; tributos: number; despesasFinanceiras: number; parcela: number
  caixa: number; aReceber: number; estoque: number; aFornecedores: number
  dividaTotal: number; dividaCP: number; diasEstoque: number
}) {
  const rec         = d.receitaBruta
  const lucBruto    = rec - d.cmv
  const despOp      = d.despesasFixas + d.folha + d.proLabore
  const ebitda      = lucBruto - despOp
  const lucLiq      = ebitda - d.tributos - d.despesasFinanceiras
  const amortizacao = Math.max(0, d.parcela - d.despesasFinanceiras)
  const sobraCaixa  = lucLiq - amortizacao
  const ativosCirc  = d.caixa + d.aReceber + d.estoque

  // Margens
  const margBruta   = rec > 0 ? lucBruto / rec : 0
  const margEbitda  = rec > 0 ? ebitda   / rec : 0
  const margLiq     = rec > 0 ? lucLiq   / rec : 0
  const margCaixa   = rec > 0 ? sobraCaixa / rec : 0
  const cmvRec      = rec > 0 ? d.cmv / rec : 0
  const custoFixoRec= rec > 0 ? despOp / rec : 0

  // Liquidez e solvência
  const liquidezC   = d.aFornecedores > 0 ? ativosCirc / d.aFornecedores : (ativosCirc > 0 ? 99 : 0)
  const liquidezS   = d.aFornecedores > 0 ? (d.caixa + d.aReceber) / d.aFornecedores : ((d.caixa + d.aReceber) > 0 ? 99 : 0)
  const passivosTotal = d.aFornecedores + d.dividaCP
  const solvencia   = passivosTotal > 0 ? ativosCirc / passivosTotal : 99

  // Endividamento
  const cobDivida   = d.parcela > 0 ? ebitda / d.parcela : 0
  const endivRec    = rec > 0 ? d.dividaTotal / rec : 0
  const capitalTerc = ativosCirc > 0 ? d.dividaTotal / ativosCirc : 0
  const grauAlavancagem = ativosCirc > 0 ? d.dividaTotal / ativosCirc : 0
  const caixaSaidas = (d.cmv + d.parcela) > 0 ? d.caixa / (d.cmv + d.parcela) : 0

  // Capital de giro
  const ncg         = d.aReceber + d.estoque - d.aFornecedores
  const giroEstoque = d.cmv > 0 ? (d.estoque / d.cmv) * 30 : 0  // dias

  // Ponto de equilíbrio
  const peBS        = margBruta > 0 ? despOp / margBruta : 0

  // Diagnóstico qualitativo automático
  const diagViabilidade  = sobraCaixa > 0 ? 'Viável no caixa real' : (lucLiq > 0 ? 'Lucra mas caixa apertado' : 'Inviável operacionalmente')
  const diagResultado    = ebitda > 0 ? 'EBITDA positivo — operação gerando resultado' : 'EBITDA negativo — operação consumindo caixa'
  const diagLiquidez     = liquidezC >= 1.5 ? 'Confortável' : (liquidezC >= 1.2 ? 'Adequada' : 'Atenção — abaixo do mínimo')
  const diagEndividamento= endivRec <= 0.30 ? 'Baixo' : (endivRec <= 0.50 ? 'Moderado' : 'Elevado — risco ao caixa')
  const diagCobertura    = cobDivida >= 2 ? 'Confortável' : (cobDivida >= 1 ? 'Adequada' : 'Crítico — EBITDA não cobre parcela')
  const prioridadeFinanceira = sobraCaixa < 0 ? 'Reestruturação urgente de caixa e dívidas'
    : ebitda < rec * 0.05 ? 'Melhorar margem e reduzir custos'
    : endivRec > 0.4 ? 'Reduzir endividamento e estruturar crédito'
    : 'Escalar operação com disciplina financeira'
  const leituraCaixa = sobraCaixa > 0 ? 'Paga as contas e sobra caixa'
    : lucLiq > 0 ? 'Lucra mas parcela consome o caixa'
    : 'Não cobre os custos operacionais'

  // Classificação geral
  const pontuacao = [
    margLiq >= 0.05 ? 2 : margLiq > 0 ? 1 : 0,
    liquidezC >= 1.5 ? 2 : liquidezC >= 1.2 ? 1 : 0,
    cobDivida >= 2 ? 2 : cobDivida >= 1 ? 1 : 0,
    endivRec <= 0.3 ? 2 : endivRec <= 0.5 ? 1 : 0,
    sobraCaixa > 0 ? 2 : 1,
  ].reduce((a, b) => a + b, 0)

  const classificacao = pontuacao >= 8 ? 'saudavel' : pontuacao >= 5 ? 'atencao' : pontuacao >= 3 ? 'critico' : 'reestruturacao'

  return {
    lucBruto, despOp, ebitda, lucLiq, amortizacao, sobraCaixa,
    margBruta, margEbitda, margLiq, margCaixa, cmvRec, custoFixoRec,
    liquidezC, liquidezS, solvencia, cobDivida, endivRec, capitalTerc,
    grauAlavancagem, caixaSaidas, ncg, giroEstoque, peBS,
    diagViabilidade, diagResultado, diagLiquidez, diagEndividamento,
    diagCobertura, prioridadeFinanceira, leituraCaixa, classificacao,
  }
}

function gerarParcelas(c: {
  id: string; modalidade: string; banco: string; numeroContrato: string | null
  dataContratacao: Date; valorTomado: number; totalParcelas: number; parcelaAtual: number
  periodicidade: string; taxa: number; vencimento: Date; valorParcela: number
}) {
  const parcelas = []
  const base = new Date(c.vencimento)
  for (let i = 0; i < (c.totalParcelas - c.parcelaAtual + 1); i++) {
    const dt = new Date(base)
    if (c.periodicidade === 'Mensal') dt.setMonth(dt.getMonth() + i)
    else if (c.periodicidade === 'Semestral') dt.setMonth(dt.getMonth() + i * 6)
    else if (c.periodicidade === 'Anual') dt.setFullYear(dt.getFullYear() + i)
    else if (c.periodicidade === 'Trimestral') dt.setMonth(dt.getMonth() + i * 3)
    parcelas.push({
      contratoId: c.id, modalidade: c.modalidade, banco: c.banco,
      contrato: c.numeroContrato ?? '', dataContratacao: c.dataContratacao,
      valorTomado: c.valorTomado, totalParcelas: c.totalParcelas,
      parcelaNum: c.parcelaAtual + i, periodicidade: c.periodicidade,
      taxa: c.taxa, vencimento: dt, valorParcela: c.valorParcela,
    })
  }
  return parcelas
}

// ── DRE ──────────────────────────────────────────────────────
router.get('/dre/:clientId', async (req: Request, res: Response) => {
  const dre = await prisma.pJDre.findFirst({
    where: { clientId: req.params.clientId },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(dre)
})

router.post('/dre', async (req: Request, res: Response) => {
  const existing = await prisma.pJDre.findFirst({ where: { clientId: req.body.clientId } })
  let dre
  if (existing) {
    dre = await prisma.pJDre.update({ where: { id: existing.id }, data: req.body })
  } else {
    dre = await prisma.pJDre.create({ data: req.body })
  }
  res.json({ ...dre, indicadores: calcDRE(dre) })
})

router.get('/dre/:clientId/indicadores', async (req: Request, res: Response) => {
  const dre = await prisma.pJDre.findFirst({ where: { clientId: req.params.clientId }, orderBy: { updatedAt: 'desc' } })
  if (!dre) return res.json(null)
  res.json({ dre, indicadores: calcDRE(dre) })
})

// ── Recebimentos ─────────────────────────────────────────────
router.get('/recebimentos/:clientId', async (req: Request, res: Response) => {
  res.json(await prisma.pJRecebimento.findMany({ where: { clientId: req.params.clientId }, orderBy: { forma: 'asc' } }))
})
router.post('/recebimentos', async (req: Request, res: Response) => {
  res.status(201).json(await prisma.pJRecebimento.create({ data: req.body }))
})
router.put('/recebimentos/:id', async (req: Request, res: Response) => {
  res.json(await prisma.pJRecebimento.update({ where: { id: req.params.id }, data: req.body }))
})
router.delete('/recebimentos/:id', async (req: Request, res: Response) => {
  await prisma.pJRecebimento.delete({ where: { id: req.params.id } }); res.status(204).send()
})

// ── Pagamentos ───────────────────────────────────────────────
router.get('/pagamentos/:clientId', async (req: Request, res: Response) => {
  res.json(await prisma.pJPagamento.findMany({ where: { clientId: req.params.clientId }, orderBy: { forma: 'asc' } }))
})
router.post('/pagamentos', async (req: Request, res: Response) => {
  res.status(201).json(await prisma.pJPagamento.create({ data: req.body }))
})
router.put('/pagamentos/:id', async (req: Request, res: Response) => {
  res.json(await prisma.pJPagamento.update({ where: { id: req.params.id }, data: req.body }))
})
router.delete('/pagamentos/:id', async (req: Request, res: Response) => {
  await prisma.pJPagamento.delete({ where: { id: req.params.id } }); res.status(204).send()
})

// ── Contratos ────────────────────────────────────────────────
router.get('/contratos/:clientId', async (req: Request, res: Response) => {
  res.json(await prisma.pJContrato.findMany({ where: { clientId: req.params.clientId }, orderBy: { vencimento: 'asc' } }))
})
router.post('/contratos', async (req: Request, res: Response) => {
  const d = { ...req.body, dataContratacao: new Date(req.body.dataContratacao), vencimento: new Date(req.body.vencimento) }
  res.status(201).json(await prisma.pJContrato.create({ data: d }))
})
router.put('/contratos/:id', async (req: Request, res: Response) => {
  const d = { ...req.body, dataContratacao: new Date(req.body.dataContratacao), vencimento: new Date(req.body.vencimento) }
  res.json(await prisma.pJContrato.update({ where: { id: req.params.id }, data: d }))
})
router.delete('/contratos/:id', async (req: Request, res: Response) => {
  await prisma.pJContrato.delete({ where: { id: req.params.id } }); res.status(204).send()
})

router.get('/cronograma/:clientId', async (req: Request, res: Response) => {
  const contratos = await prisma.pJContrato.findMany({ where: { clientId: req.params.clientId } })
  const parcelas = contratos.flatMap(c => gerarParcelas(c)).sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())
  const porAno: Record<number, { parcelas: number; total: number }> = {}
  parcelas.forEach(p => {
    const a = p.vencimento.getFullYear()
    if (!porAno[a]) porAno[a] = { parcelas: 0, total: 0 }
    porAno[a].parcelas++; porAno[a].total += p.valorParcela
  })
  res.json({ parcelas, porAno, totalEndividamento: contratos.reduce((s, c) => s + c.valorTomado, 0), totalFuturo: parcelas.reduce((s, p) => s + p.valorParcela, 0), totalContratos: contratos.length })
})

// ── Despesas ─────────────────────────────────────────────────
router.get('/despesas/:clientId', async (req: Request, res: Response) => {
  res.json(await prisma.pJDespesa.findMany({ where: { clientId: req.params.clientId }, orderBy: { data: 'asc' } }))
})
router.post('/despesas', async (req: Request, res: Response) => {
  res.status(201).json(await prisma.pJDespesa.create({ data: { ...req.body, data: new Date(req.body.data) } }))
})
router.delete('/despesas/:id', async (req: Request, res: Response) => {
  await prisma.pJDespesa.delete({ where: { id: req.params.id } }); res.status(204).send()
})

// ── Receitas ─────────────────────────────────────────────────
router.get('/receitas/:clientId', async (req: Request, res: Response) => {
  res.json(await prisma.pJReceita.findMany({ where: { clientId: req.params.clientId }, orderBy: { data: 'asc' } }))
})
router.post('/receitas', async (req: Request, res: Response) => {
  res.status(201).json(await prisma.pJReceita.create({ data: { ...req.body, data: new Date(req.body.data) } }))
})
router.delete('/receitas/:id', async (req: Request, res: Response) => {
  await prisma.pJReceita.delete({ where: { id: req.params.id } }); res.status(204).send()
})

// ── Custos fixos ─────────────────────────────────────────────
router.get('/custos-fixos/:clientId', async (req: Request, res: Response) => {
  res.json(await prisma.pJCustoFixo.findMany({ where: { clientId: req.params.clientId }, orderBy: [{ categoria: 'asc' }, { item: 'asc' }] }))
})
router.post('/custos-fixos', async (req: Request, res: Response) => {
  res.status(201).json(await prisma.pJCustoFixo.create({ data: req.body }))
})
router.put('/custos-fixos/:id', async (req: Request, res: Response) => {
  res.json(await prisma.pJCustoFixo.update({ where: { id: req.params.id }, data: req.body }))
})
router.delete('/custos-fixos/:id', async (req: Request, res: Response) => {
  await prisma.pJCustoFixo.delete({ where: { id: req.params.id } }); res.status(204).send()
})

// ── Fluxo diário ─────────────────────────────────────────────
router.get('/fluxo-diario/:clientId', async (req: Request, res: Response) => {
  const cid = req.params.clientId
  const saldoInicial = Number(req.query.saldoInicial ?? 0)
  const [contratos, despesas, receitas] = await Promise.all([
    prisma.pJContrato.findMany({ where: { clientId: cid } }),
    prisma.pJDespesa.findMany({ where: { clientId: cid } }),
    prisma.pJReceita.findMany({ where: { clientId: cid } }),
  ])
  const movs: Array<{ data: Date; mov: string; tipo: string; origem: string; descricao: string; valor: number }> = []
  contratos.flatMap(c => gerarParcelas(c)).forEach(p => movs.push({ data: p.vencimento, mov: 'SAÍDA', tipo: 'Endividamento', origem: p.banco, descricao: `${p.modalidade} ${p.parcelaNum}/${p.totalParcelas} - ${p.contrato}`, valor: p.valorParcela }))
  despesas.forEach(d => movs.push({ data: d.data, mov: 'SAÍDA', tipo: d.tipo, origem: d.origem, descricao: d.descricao, valor: d.valor }))
  receitas.forEach(r => movs.push({ data: r.data, mov: 'ENTRADA', tipo: r.tipo, origem: r.origem, descricao: r.descricao, valor: r.valor }))
  movs.sort((a, b) => a.data.getTime() - b.data.getTime())
  let saldo = saldoInicial
  const fluxo = movs.map(m => { if (m.mov === 'ENTRADA') saldo += m.valor; else saldo -= m.valor; return { ...m, saldoFinal: saldo } })
  res.json({ fluxo, saldoInicial, saldoFinal: saldo })
})

// ── Fluxo mensal ─────────────────────────────────────────────
router.get('/fluxo-mensal/:clientId', async (req: Request, res: Response) => {
  const cid = req.params.clientId
  const saldoInicial = Number(req.query.saldoInicial ?? 0)
  const [contratos, despesas, receitas] = await Promise.all([
    prisma.pJContrato.findMany({ where: { clientId: cid } }),
    prisma.pJDespesa.findMany({ where: { clientId: cid } }),
    prisma.pJReceita.findMany({ where: { clientId: cid } }),
  ])
  const porMes: Record<string, { entradas: number; saidas: number }> = {}
  const add = (dt: Date, tipo: 'e' | 's', v: number) => {
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    if (!porMes[k]) porMes[k] = { entradas: 0, saidas: 0 }
    if (tipo === 'e') porMes[k].entradas += v; else porMes[k].saidas += v
  }
  contratos.flatMap(c => gerarParcelas(c)).forEach(p => add(p.vencimento, 's', p.valorParcela))
  despesas.forEach(d => add(d.data, 's', d.valor))
  receitas.forEach(r => add(r.data, 'e', r.valor))
  let saldo = saldoInicial
  const mensal = Object.keys(porMes).sort().map(mes => {
    const s = saldoInicial === 0 ? saldo : saldo  // carry-over
    const si = saldo
    saldo += porMes[mes].entradas - porMes[mes].saidas
    return { mes, saldoInicial: si, entradas: porMes[mes].entradas, saidas: porMes[mes].saidas, saldoFinal: saldo }
  })
  const porAno: Record<number, { entradas: number; saidas: number; resultado: number }> = {}
  mensal.forEach(m => {
    const a = parseInt(m.mes.split('-')[0])
    if (!porAno[a]) porAno[a] = { entradas: 0, saidas: 0, resultado: 0 }
    porAno[a].entradas += m.entradas; porAno[a].saidas += m.saidas; porAno[a].resultado += m.entradas - m.saidas
  })
  res.json({ mensal, porAno, saldoFinal: saldo })
})

// ── Stress Test ──────────────────────────────────────────────
router.get('/stress-test/:clientId', async (req: Request, res: Response) => {
  const cid = req.params.clientId
  const dre = await prisma.pJDre.findFirst({ where: { clientId: cid }, orderBy: { updatedAt: 'desc' } })
  const st  = await prisma.pJStressTest.findFirst({ where: { clientId: cid } })

  if (!dre) return res.json(null)

  const pct  = st?.pctCustoVar  ?? (dre.cmv / Math.max(dre.receitaBruta, 1))
  const pctF = st?.pctDespFixaVar ?? 0.05
  const vQ   = st?.variacaoQueda ?? -0.3
  const vA   = st?.variacaoAlta  ?? 0.3
  const saldoI = st?.saldoInicial ?? dre.caixa

  const calcCenario = (variacao: number) => {
    const rec    = dre.receitaBruta * (1 + variacao)
    const cmvP   = rec * pct
    const despF  = dre.despesasFixas * (1 + variacao * pctF) + dre.folha * (1 + variacao * pctF) + dre.proLabore
    const ebitda = rec - cmvP - despF
    const lucLiq = ebitda - dre.tributos - dre.despesasFinanceiras
    const amort  = dre.parcela - dre.despesasFinanceiras
    const sobra  = lucLiq - amort
    const margE  = rec > 0 ? ebitda / rec : 0
    const cobD   = dre.parcela > 0 ? ebitda / dre.parcela : 0
    return { rec, cmvP, despF, ebitda, lucLiq, sobra, margE, cobD }
  }

  const queda = calcCenario(vQ)
  const base  = calcCenario(0)
  const alta  = calcCenario(vA)

  // Projeção 12 meses (cenário variação atual ou alta)
  const varAtual = vA
  const c12 = calcCenario(varAtual)
  let saldo = saldoI
  const meses12 = Array.from({ length: 12 }, (_, i) => {
    const compras = i === 0 ? c12.cmvP * (1 + (dre.diasEstoque / 30)) : c12.cmvP
    const geracao = c12.ebitda - dre.tributos - dre.despesasFinanceiras - (dre.parcela - dre.despesasFinanceiras)
    const ger12 = i === 0 ? geracao - compras + c12.cmvP : geracao
    saldo += ger12
    return {
      mes: i + 1,
      receita: c12.rec, cmv: c12.cmvP, compras,
      despesaFixa: c12.despF, ebitda: c12.ebitda,
      margEbitda: c12.margE, cobDivida: c12.cobD,
      tributos: dre.tributos, despFin: dre.despesasFinanceiras,
      lucroLiq: c12.lucLiq, geracao: ger12, saldoFinal: saldo,
    }
  })

  res.json({
    dre,
    cenarios: { queda: { variacao: vQ, ...queda }, base: { variacao: 0, ...base }, alta: { variacao: vA, ...alta } },
    premissas: { pctCustoVar: pct, pctDespFixaVar: pctF, variacaoQueda: vQ, variacaoAlta: vA, saldoInicial: saldoI },
    meses12,
    statusAlta: alta.sobra > 0 ? 'Confortável' : alta.sobra > -dre.receitaBruta * 0.05 ? 'Atenção' : 'Crítico',
  })
})

router.post('/stress-test/premissas', async (req: Request, res: Response) => {
  const existing = await prisma.pJStressTest.findFirst({ where: { clientId: req.body.clientId } })
  if (existing) {
    res.json(await prisma.pJStressTest.update({ where: { id: existing.id }, data: req.body }))
  } else {
    res.status(201).json(await prisma.pJStressTest.create({ data: req.body }))
  }
})

// ── Benchmarks ───────────────────────────────────────────────
router.get('/benchmark/pj/:segmento', (req: Request, res: Response) => {
  const bm = getBenchmarkPJ(req.params.segmento)
  res.json(bm)
})

router.get('/benchmark/agro/:cultura', (req: Request, res: Response) => {
  const key = req.params.cultura.toUpperCase()
  const bm = BENCHMARKS_AGRO[key] ?? BENCHMARKS_AGRO['SOJA']
  res.json(bm)
})

export default router
