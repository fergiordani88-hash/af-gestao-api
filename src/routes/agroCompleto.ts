import { Router, Request, Response } from 'express'
import multer from 'multer'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { parsePdfContract } from '../lib/pdfContractParser'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

const router = Router()
router.use(requireAuth)

// Taxas de referência vigentes (decimal a.a.) — atualizar conforme divulgação oficial
const TAXAS_REF: Record<string, number> = {
  CDI:   0.1475, // Meta SELIC/CDI — COPOM jul/2025
  SELIC: 0.1475,
  IPCA:  0.0548, // IPCA acumulado 12 meses jun/2025 — IBGE
  TR:    0.0088, // TR estimada — BACEN jul/2025
}
const taxaRef = (idx?: string | null) => TAXAS_REF[idx ?? ''] ?? 0

const CDI_ATUAL = 0.1475 // mantido para compatibilidade

function periodosPorAno(periodicidade: string): number {
  if (periodicidade === 'Mensal')     return 12
  if (periodicidade === 'Semestral')  return 2
  if (periodicidade === 'Trimestral') return 4
  return 1 // Anual / Único
}

function avancaData(base: Date, periodicidade: string, i: number): Date {
  const d = new Date(base)
  if (periodicidade === 'Mensal')     d.setMonth(d.getMonth() + i)
  else if (periodicidade === 'Semestral') d.setMonth(d.getMonth() + i * 6)
  else if (periodicidade === 'Trimestral') d.setMonth(d.getMonth() + i * 3)
  else d.setFullYear(d.getFullYear() + i)
  return d
}

// ── Helpers de amortização ──────────────────────────────────────────────────────

// Price (PMT): parcela constante
function calcPMT(pv: number, taxaPeriodo: number, n: number): number {
  if (taxaPeriodo === 0) return pv / n
  return pv * (taxaPeriodo * Math.pow(1 + taxaPeriodo, n)) / (Math.pow(1 + taxaPeriodo, n) - 1)
}

// Saldo devedor Price após k pagamentos realizados
function saldoPrice(pv: number, taxaPeriodo: number, n: number, k: number): number {
  if (taxaPeriodo === 0) return pv * (1 - k / n)
  const restantes = n - k
  const pmt = calcPMT(pv, taxaPeriodo, n)
  return pmt * (1 - Math.pow(1 + taxaPeriodo, -restantes)) / taxaPeriodo
}

// ── Helper: gera cronograma de parcelas a partir de um contrato ──
function gerarParcelas(contrato: {
  id: string; modalidade: string; banco: string; numeroContrato: string | null
  dataContratacao: Date; valorTomado: number; totalParcelas: number; parcelaAtual: number
  periodicidade: string; taxa: number; vencimento: Date; valorParcela: number
  indexador?: string | null; spreadIndexador?: number | null
  sistemaAmortizacao?: string | null
}) {
  const parcelas = []
  const base = new Date(contrato.vencimento)
  const isPosFix = contrato.indexador && contrato.indexador !== 'Pré-fixado'
  const nPeriodos = periodosPorAno(contrato.periodicidade)

  // Taxa anual efetiva: pós-fixado = spread + índice de referência; pré-fixado = taxa contratual
  const taxaAnual = isPosFix
    ? (contrato.spreadIndexador ?? 0) + taxaRef(contrato.indexador)
    : contrato.taxa

  const taxaPeriodo = Math.pow(1 + taxaAnual, 1 / nPeriodos) - 1

  // Pós-fixados sempre usam SAC; pré-fixados respeitam sistemaAmortizacao
  const useSAC = isPosFix || contrato.sistemaAmortizacao === 'SAC'

  const n = contrato.totalParcelas
  const k = contrato.parcelaAtual - 1 // parcelas já pagas
  const restantes = n - k

  // Amortização constante (SAC)
  const amortConst = contrato.valorTomado / n

  // Saldo devedor no início da parcela atual
  let saldo: number
  if (useSAC) {
    saldo = contrato.valorTomado - amortConst * k
  } else {
    // Price: saldo descontado pela fórmula financeira
    saldo = saldoPrice(contrato.valorTomado, taxaPeriodo, n, k)
  }

  // PMT para Price (constante)
  const pmt = useSAC ? 0 : calcPMT(contrato.valorTomado, taxaPeriodo, n)

  for (let i = 0; i < restantes; i++) {
    const data = avancaData(base, contrato.periodicidade, i)
    const juros = saldo * taxaPeriodo
    let amortReal: number
    let valorParcela: number

    if (useSAC) {
      amortReal    = amortConst
      valorParcela = amortConst + juros
      saldo        -= amortConst
    } else {
      valorParcela = pmt
      amortReal    = pmt - juros
      saldo        -= amortReal
    }

    // Evita saldo negativo por arredondamento na última parcela
    if (i === restantes - 1 && Math.abs(saldo) < 0.01) saldo = 0

    parcelas.push({
      contratoId:        contrato.id,
      modalidade:        contrato.modalidade,
      banco:             contrato.banco,
      contrato:          contrato.numeroContrato ?? '',
      dataContratacao:   contrato.dataContratacao,
      valorTomado:       contrato.valorTomado,
      totalParcelas:     n,
      parcelaNum:        k + 1 + i,
      periodicidade:     contrato.periodicidade,
      taxa:              taxaAnual,
      vencimento:        data,
      valorParcela:      Math.round(valorParcela * 100) / 100,
      indexador:         contrato.indexador ?? 'Pré-fixado',
      sistemaAmortizacao: contrato.sistemaAmortizacao ?? 'Price',
      amortizacao:       Math.round(amortReal * 100) / 100,
      juros:             Math.round(juros * 100) / 100,
      saldoDevedor:      Math.round(Math.max(saldo, 0) * 100) / 100,
    })
  }
  return parcelas
}

// ─────────────────────────────────────────────
// PRODUÇÃO
// ─────────────────────────────────────────────
router.get('/producao/:clientId', async (req: Request, res: Response) => {
  const items = await prisma.agroProducao.findMany({
    where: { clientId: req.params.clientId },
    orderBy: [{ safra: 'asc' }, { ordem: 'asc' }],
  })
  res.json(items)
})

router.post('/producao', async (req: Request, res: Response) => {
  const item = await prisma.agroProducao.create({ data: req.body })
  res.status(201).json(item)
})

router.put('/producao/:id', async (req: Request, res: Response) => {
  const body = { ...req.body }
  if (body.dataPagamento && typeof body.dataPagamento === 'string') {
    body.dataPagamento = new Date(body.dataPagamento)
  }
  const item = await prisma.agroProducao.update({ where: { id: req.params.id }, data: body })
  res.json(item)
})

router.delete('/producao/:id', async (req: Request, res: Response) => {
  await prisma.agroProducao.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// ─────────────────────────────────────────────
// CONTRATOS DE CRÉDITO
// ─────────────────────────────────────────────
router.get('/contratos/:clientId', async (req: Request, res: Response) => {
  const contratos = await prisma.agroContrato.findMany({
    where: { clientId: req.params.clientId },
    orderBy: { vencimento: 'asc' },
  })
  res.json(contratos)
})

// Tenta parsear uma data no formato YYYY-MM-DD ou YYYY-DD-MM (caso Claude inverta dia/mês)
function parseFlexDate(val: string | undefined): Date | null {
  if (!val) return null
  const d = new Date(val)
  if (!isNaN(d.getTime())) return d
  // Tenta inverter dia e mês (YYYY-DD-MM → YYYY-MM-DD)
  const parts = val.split('-')
  if (parts.length === 3) {
    const swapped = new Date(`${parts[0]}-${parts[2]}-${parts[1]}`)
    if (!isNaN(swapped.getTime())) return swapped
  }
  return null
}

// Para SAC pré-fixado: calcula a parcela atual (amort + juros sobre saldo) e retorna como valorParcela
function calcValorParcelaSAC(data: any): number {
  const pv   = Number(data.valorTomado   || 0)
  const n    = Number(data.totalParcelas || 0)
  const k    = Number(data.parcelaAtual  || 1) - 1  // parcelas já pagas
  const taxa = Number(data.taxa          || 0)       // anual decimal
  if (!pv || !n || !taxa) return Number(data.valorParcela || 0)

  const nPer = periodosPorAno(data.periodicidade || 'Mensal')
  const i    = Math.pow(1 + taxa, 1 / nPer) - 1
  const amort = pv / n
  const saldo = pv - amort * k
  return Math.round((amort + saldo * i) * 100) / 100
}

router.post('/contratos', async (req: Request, res: Response) => {
  const data = { ...req.body }
  data.dataContratacao = data.dataContratacao ? parseFlexDate(data.dataContratacao) ?? new Date() : new Date()
  data.vencimento = data.vencimento ? parseFlexDate(data.vencimento) ?? new Date() : new Date()
  if (data.parcelaAtual === undefined || data.parcelaAtual === null) data.parcelaAtual = 1
  // SAC pré-fixado: auto-calcula a parcela atual pela fórmula
  const isPosFix = data.indexador && data.indexador !== 'Pré-fixado'
  if (data.sistemaAmortizacao === 'SAC' && !isPosFix) {
    data.valorParcela = calcValorParcelaSAC(data)
  }
  const item = await prisma.agroContrato.create({ data })
  res.status(201).json(item)
})

router.put('/contratos/:id', async (req: Request, res: Response) => {
  const data = { ...req.body }
  if (data.dataContratacao) data.dataContratacao = new Date(data.dataContratacao)
  if (data.vencimento) data.vencimento = new Date(data.vencimento)
  // SAC pré-fixado: re-calcula a parcela atual ao editar
  const isPosFix = data.indexador && data.indexador !== 'Pré-fixado'
  if (data.sistemaAmortizacao === 'SAC' && !isPosFix) {
    data.valorParcela = calcValorParcelaSAC(data)
  }
  const item = await prisma.agroContrato.update({ where: { id: req.params.id }, data })
  res.json(item)
})

router.delete('/contratos/:id', async (req: Request, res: Response) => {
  await prisma.agroContrato.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// Cronograma ordenado — gera automaticamente todas as parcelas futuras, ordenadas por vencimento
router.get('/cronograma/:clientId', async (req: Request, res: Response) => {
  const contratos = await prisma.agroContrato.findMany({
    where: { clientId: req.params.clientId },
  })

  const todasParcelas = contratos.flatMap(c => gerarParcelas(c))
  todasParcelas.sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())

  // Resumo por ano
  const porAno: Record<number, { parcelas: number; total: number; juros: number; amortizacao: number }> = {}
  todasParcelas.forEach(p => {
    const ano = p.vencimento.getFullYear()
    if (!porAno[ano]) porAno[ano] = { parcelas: 0, total: 0, juros: 0, amortizacao: 0 }
    porAno[ano].parcelas++
    porAno[ano].total += p.valorParcela
    porAno[ano].juros += p.juros ?? 0
    porAno[ano].amortizacao += p.amortizacao ?? 0
  })

  // Total endividamento
  const totalEndividamento = contratos.reduce((s, c) => s + c.valorTomado, 0)
  const totalFuturo = todasParcelas.reduce((s, p) => s + p.valorParcela, 0)

  res.json({
    parcelas: todasParcelas,
    porAno,
    totalEndividamento,
    totalFuturo,
    totalContratos: contratos.length,
  })
})

// ─────────────────────────────────────────────
// DESPESAS
// ─────────────────────────────────────────────
router.get('/despesas/:clientId', async (req: Request, res: Response) => {
  const items = await prisma.agroDespesa.findMany({
    where: { clientId: req.params.clientId },
    orderBy: { data: 'asc' },
  })
  res.json(items)
})

router.post('/despesas', async (req: Request, res: Response) => {
  const data = { ...req.body, data: new Date(req.body.data) }
  const item = await prisma.agroDespesa.create({ data })
  res.status(201).json(item)
})

router.put('/despesas/:id', async (req: Request, res: Response) => {
  const data = { ...req.body, data: new Date(req.body.data) }
  const item = await prisma.agroDespesa.update({ where: { id: req.params.id }, data })
  res.json(item)
})

router.delete('/despesas/:id', async (req: Request, res: Response) => {
  await prisma.agroDespesa.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// ─────────────────────────────────────────────
// RECEITAS
// ─────────────────────────────────────────────
router.get('/receitas/:clientId', async (req: Request, res: Response) => {
  const items = await prisma.agroReceita.findMany({
    where: { clientId: req.params.clientId },
    orderBy: { data: 'asc' },
  })
  res.json(items)
})

router.post('/receitas', async (req: Request, res: Response) => {
  const data = { ...req.body, data: new Date(req.body.data) }
  const item = await prisma.agroReceita.create({ data })
  res.status(201).json(item)
})

router.delete('/receitas/:id', async (req: Request, res: Response) => {
  await prisma.agroReceita.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// ─────────────────────────────────────────────
// CUSTOS FIXOS
// ─────────────────────────────────────────────
router.get('/custos-fixos/:clientId', async (req: Request, res: Response) => {
  const items = await prisma.agroCustoFixo.findMany({
    where: { clientId: req.params.clientId },
    orderBy: [{ categoria: 'asc' }, { item: 'asc' }],
  })
  res.json(items)
})

router.post('/custos-fixos', async (req: Request, res: Response) => {
  const item = await prisma.agroCustoFixo.create({ data: req.body })
  res.status(201).json(item)
})

router.put('/custos-fixos/:id', async (req: Request, res: Response) => {
  const item = await prisma.agroCustoFixo.update({ where: { id: req.params.id }, data: req.body })
  res.json(item)
})

router.delete('/custos-fixos/:id', async (req: Request, res: Response) => {
  await prisma.agroCustoFixo.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// ─────────────────────────────────────────────
// PATRIMÔNIO
// ─────────────────────────────────────────────
router.get('/patrimonio/:clientId', async (req: Request, res: Response) => {
  const items = await prisma.agroPatrimonio.findMany({
    where: { clientId: req.params.clientId },
    orderBy: { categoria: 'asc' },
  })
  res.json(items)
})

router.post('/patrimonio', async (req: Request, res: Response) => {
  const item = await prisma.agroPatrimonio.create({ data: req.body })
  res.status(201).json(item)
})

router.put('/patrimonio/:id', async (req: Request, res: Response) => {
  const item = await prisma.agroPatrimonio.update({ where: { id: req.params.id }, data: req.body })
  res.json(item)
})

router.delete('/patrimonio/:id', async (req: Request, res: Response) => {
  await prisma.agroPatrimonio.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// ─────────────────────────────────────────────
// FLUXO DE CAIXA DIÁRIO — combina tudo automaticamente
// ─────────────────────────────────────────────
// Gera datas mensais de vencimento para um custo fixo — 24 meses a partir de hoje
function gerarVencimentosCustoFixo(dia: number): Date[] {
  const hoje = new Date()
  const datas: Date[] = []
  for (let i = 0; i < 24; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, Math.min(dia, 28))
    datas.push(d)
  }
  return datas
}

router.get('/fluxo-diario/:clientId', async (req: Request, res: Response) => {
  const cid = req.params.clientId
  const saldoInicial = Number(req.query.saldoInicial ?? 0)

  const [contratos, despesas, receitas, custosFixos, producoes] = await Promise.all([
    prisma.agroContrato.findMany({ where: { clientId: cid } }),
    prisma.agroDespesa.findMany({ where: { clientId: cid } }),
    prisma.agroReceita.findMany({ where: { clientId: cid } }),
    prisma.agroCustoFixo.findMany({ where: { clientId: cid } }),
    prisma.agroProducao.findMany({ where: { clientId: cid, dataPagamento: { not: null } } }),
  ])

  const movimentos: Array<{
    data: Date; mov: string; tipo: string; origem: string; descricao: string; valor: number; id?: string
  }> = []

  // Parcelas dos contratos
  contratos.flatMap(c => gerarParcelas(c)).forEach(p => {
    movimentos.push({
      data: p.vencimento,
      mov: 'SAÍDA',
      tipo: 'Endividamento',
      origem: p.banco,
      descricao: `${p.modalidade} ${p.parcelaNum}/${p.totalParcelas} - Contrato ${p.contrato}`,
      valor: p.valorParcela,
    })
  })

  // Despesas não bancárias
  despesas.forEach(d => {
    movimentos.push({
      data: d.data,
      mov: 'SAÍDA',
      tipo: d.tipo,
      origem: d.origem,
      descricao: d.descricao,
      valor: d.valor,
      id: d.id,
    })
  })

  // Custos fixos — gera 24 meses de vencimentos
  custosFixos.forEach(cf => {
    const dia = (cf as any).diaVencimento ?? 5
    gerarVencimentosCustoFixo(dia).forEach(data => {
      movimentos.push({
        data,
        mov: 'SAÍDA',
        tipo: 'Custo Fixo',
        origem: cf.categoria,
        descricao: cf.item,
        valor: cf.valorMensal,
      })
    })
  })

  // Custos de produção (COE + arrendamento) com data definida
  producoes.forEach(p => {
    if (!p.dataPagamento) return
    const custoCOE = p.area * p.custoPorHa * (p.cotacao || 1)
    if (custoCOE > 0) {
      movimentos.push({
        data: p.dataPagamento,
        mov: 'SAÍDA',
        tipo: 'Custo da atividade',
        origem: p.cultura,
        descricao: `COE ${p.cultura} ${p.safra}`,
        valor: custoCOE,
      })
    }
    const custoArrend = p.areaArrendada * p.custoArrendHa * (p.cotacao || 1)
    if (custoArrend > 0) {
      movimentos.push({
        data: p.dataPagamento,
        mov: 'SAÍDA',
        tipo: 'Custo da atividade',
        origem: p.cultura,
        descricao: `Arrendamento ${p.cultura} ${p.safra}`,
        valor: custoArrend,
      })
    }
  })

  // Receitas
  receitas.forEach(r => {
    movimentos.push({
      data: r.data,
      mov: 'ENTRADA',
      tipo: r.tipo,
      origem: r.origem,
      descricao: r.descricao,
      valor: r.valor,
    })
  })

  const movimentosFiltrados = movimentos.filter(m => m.valor > 0)
  movimentosFiltrados.sort((a, b) => a.data.getTime() - b.data.getTime())

  let saldo = saldoInicial
  const fluxo = movimentosFiltrados.map(m => {
    if (m.mov === 'ENTRADA') saldo += m.valor
    else saldo -= m.valor
    return { ...m, saldoFinal: saldo }
  })

  res.json({ fluxo, saldoInicial, saldoFinal: saldo })
})

// ─────────────────────────────────────────────
// FLUXO SINTÉTICO MENSAL
// ─────────────────────────────────────────────
router.get('/fluxo-mensal/:clientId', async (req: Request, res: Response) => {
  const cid = req.params.clientId
  const saldoInicial = Number(req.query.saldoInicial ?? 0)

  const [contratos, despesas, receitas, custosFixos, producoes] = await Promise.all([
    prisma.agroContrato.findMany({ where: { clientId: cid } }),
    prisma.agroDespesa.findMany({ where: { clientId: cid } }),
    prisma.agroReceita.findMany({ where: { clientId: cid } }),
    prisma.agroCustoFixo.findMany({ where: { clientId: cid } }),
    prisma.agroProducao.findMany({ where: { clientId: cid, dataPagamento: { not: null } } }),
  ])

  const porMes: Record<string, { entradas: number; saidas: number }> = {}

  const addMes = (data: Date, tipo: 'entrada' | 'saida', valor: number) => {
    if (valor <= 0) return
    const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
    if (!porMes[key]) porMes[key] = { entradas: 0, saidas: 0 }
    if (tipo === 'entrada') porMes[key].entradas += valor
    else porMes[key].saidas += valor
  }

  contratos.flatMap(c => gerarParcelas(c)).forEach(p => addMes(p.vencimento, 'saida', p.valorParcela))
  despesas.forEach(d => addMes(d.data, 'saida', d.valor))
  receitas.forEach(r => addMes(r.data, 'entrada', r.valor))
  custosFixos.forEach(cf => {
    const dia = (cf as any).diaVencimento ?? 5
    gerarVencimentosCustoFixo(dia).forEach(data => addMes(data, 'saida', cf.valorMensal))
  })
  producoes.forEach(p => {
    if (!p.dataPagamento) return
    const custoCOE = p.area * p.custoPorHa * (p.cotacao || 1)
    if (custoCOE > 0) addMes(p.dataPagamento, 'saida', custoCOE)
    const custoArrend = p.areaArrendada * p.custoArrendHa * (p.cotacao || 1)
    if (custoArrend > 0) addMes(p.dataPagamento, 'saida', custoArrend)
  })

  const meses = Object.keys(porMes).sort()
  let saldo = saldoInicial
  const resultado = meses.map(mes => {
    const m = porMes[mes]
    const saldoIni = saldo
    saldo += m.entradas - m.saidas
    return {
      mes,
      saldoInicial: saldoIni,
      entradas: m.entradas,
      saidas: m.saidas,
      saldoFinal: saldo,
    }
  })

  // Agrupa por ano para resumo
  const porAno: Record<number, { entradas: number; saidas: number; resultado: number }> = {}
  resultado.forEach(m => {
    const ano = parseInt(m.mes.split('-')[0])
    if (!porAno[ano]) porAno[ano] = { entradas: 0, saidas: 0, resultado: 0 }
    porAno[ano].entradas += m.entradas
    porAno[ano].saidas += m.saidas
    porAno[ano].resultado += m.entradas - m.saidas
  })

  res.json({ mensal: resultado, porAno, saldoFinal: saldo })
})

// ─────────────────────────────────────────────
// DESPESAS ANUAIS — totais por tipo/ano para projeção
// ─────────────────────────────────────────────
router.get('/despesas-anuais/:clientId', async (req: Request, res: Response) => {
  const despesas = await prisma.agroDespesa.findMany({ where: { clientId: req.params.clientId } })
  const CUSTO_ATIV_TIPOS = ['Custo da atividade']
  const porAno: Record<number, { custoAtiv: number; despAdmin: number; total: number }> = {}
  despesas.forEach(d => {
    const ano = new Date(d.data).getFullYear()
    if (!porAno[ano]) porAno[ano] = { custoAtiv: 0, despAdmin: 0, total: 0 }
    if (CUSTO_ATIV_TIPOS.includes(d.tipo)) porAno[ano].custoAtiv += d.valor
    else porAno[ano].despAdmin += d.valor
    porAno[ano].total += d.valor
  })
  res.json(porAno)
})

// POST /agro/contratos/import-pdf — extrai campos de contrato de crédito de um PDF
router.post('/contratos/import-pdf', upload.single('pdf'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })
  try {
    const fields = await parsePdfContract(req.file.buffer)
    return res.json(fields)
  } catch (e: any) {
    return res.status(422).json({ error: 'Erro ao processar PDF: ' + e.message })
  }
})

// POST /agro/cadastro/preview — lê PDF de cadastro bancário e extrai patrimônio + produção
router.post('/cadastro/preview', upload.single('pdf'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })
  try {
    const { parseCadastroProdutor } = await import('../lib/parseCadastroProdutor')
    const result = await parseCadastroProdutor(req.file.buffer)
    return res.json(result)
  } catch (e: any) {
    return res.status(422).json({ error: 'Erro ao processar PDF: ' + e.message })
  }
})

// POST /agro/cadastro/confirm — grava patrimônio e produção extraídos
router.post('/cadastro/confirm', async (req: Request, res: Response) => {
  const { clientId, patrimonio = [], producao = [] } = req.body
  if (!clientId) return res.status(400).json({ error: 'clientId obrigatório' })

  const patResults = await Promise.allSettled(
    patrimonio.map((p: any) =>
      prisma.agroPatrimonio.create({ data: { ...p, clientId } })
    )
  )
  const prodResults = await Promise.allSettled(
    producao.map((p: any) =>
      prisma.agroProducao.create({
        data: {
          ...p,
          clientId,
          tipo:  p.tipo  ?? 'historico',
          ordem: p.ordem ?? 'principal',
        },
      })
    )
  )

  return res.json({
    patrimonioImportado: patResults.filter(r => r.status === 'fulfilled').length,
    patrimonioErros:     patResults.filter(r => r.status === 'rejected').length,
    producaoImportada:   prodResults.filter(r => r.status === 'fulfilled').length,
    producaoErros:       prodResults.filter(r => r.status === 'rejected').length,
  })
})

export default router
