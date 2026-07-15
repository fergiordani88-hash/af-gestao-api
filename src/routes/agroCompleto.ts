import { Router, Request, Response } from 'express'
import multer from 'multer'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { parsePdfContract } from '../lib/pdfContractParser'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

const router = Router()
router.use(requireAuth)

const CDI_ATUAL = 0.1475 // 14,75% a.a. — meta SELIC/CDI vigente

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

// ── Helper: gera cronograma de parcelas a partir de um contrato ──
function gerarParcelas(contrato: {
  id: string; modalidade: string; banco: string; numeroContrato: string | null
  dataContratacao: Date; valorTomado: number; totalParcelas: number; parcelaAtual: number
  periodicidade: string; taxa: number; vencimento: Date; valorParcela: number
  indexador?: string | null; spreadIndexador?: number | null
}) {
  const parcelas = []
  const base = new Date(contrato.vencimento)
  const isPosFix = contrato.indexador && contrato.indexador !== 'Pré-fixado'
  const nPeriodos = periodosPorAno(contrato.periodicidade)

  // Taxa anual efetiva: para pós-fixado = spread + CDI; para pré-fixado = taxa do contrato
  const taxaAnual = isPosFix
    ? (contrato.spreadIndexador ?? 0) + CDI_ATUAL
    : contrato.taxa

  // Taxa por período (juros compostos)
  const taxaPeriodo = Math.pow(1 + taxaAnual, 1 / nPeriodos) - 1

  // Amortização constante (SAC): saldo devedor estimado na parcela atual
  const amortizacao = contrato.valorTomado / contrato.totalParcelas
  // Saldo na parcela atual = valor tomado menos amortizações já pagas
  let saldo = contrato.valorTomado - amortizacao * (contrato.parcelaAtual - 1)

  const restantes = contrato.totalParcelas - contrato.parcelaAtual + 1

  for (let i = 0; i < restantes; i++) {
    const data = avancaData(base, contrato.periodicidade, i)

    let valorParcela: number
    if (isPosFix) {
      // SAC com CDI: amort constante + juros sobre saldo devedor
      const juros = saldo * taxaPeriodo
      valorParcela = amortizacao + juros
      saldo -= amortizacao
    } else {
      valorParcela = contrato.valorParcela
    }

    parcelas.push({
      contratoId:      contrato.id,
      modalidade:      contrato.modalidade,
      banco:           contrato.banco,
      contrato:        contrato.numeroContrato ?? '',
      dataContratacao: contrato.dataContratacao,
      valorTomado:     contrato.valorTomado,
      totalParcelas:   contrato.totalParcelas,
      parcelaNum:      contrato.parcelaAtual + i,
      periodicidade:   contrato.periodicidade,
      taxa:            taxaAnual,
      vencimento:      data,
      valorParcela:    Math.round(valorParcela * 100) / 100,
      indexador:       contrato.indexador ?? 'Pré-fixado',
      amortizacao:     isPosFix ? Math.round(amortizacao * 100) / 100 : undefined,
      juros:           isPosFix ? Math.round((valorParcela - amortizacao) * 100) / 100 : undefined,
      saldoDevedor:    isPosFix ? Math.round(saldo * 100) / 100 : undefined,
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
  const item = await prisma.agroProducao.update({ where: { id: req.params.id }, data: req.body })
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

router.post('/contratos', async (req: Request, res: Response) => {
  const data = { ...req.body }
  data.dataContratacao = data.dataContratacao ? parseFlexDate(data.dataContratacao) ?? new Date() : new Date()
  data.vencimento = data.vencimento ? parseFlexDate(data.vencimento) ?? new Date() : new Date()
  if (data.parcelaAtual === undefined || data.parcelaAtual === null) data.parcelaAtual = 1
  const item = await prisma.agroContrato.create({ data })
  res.status(201).json(item)
})

router.put('/contratos/:id', async (req: Request, res: Response) => {
  const data = { ...req.body }
  if (data.dataContratacao) data.dataContratacao = new Date(data.dataContratacao)
  if (data.vencimento) data.vencimento = new Date(data.vencimento)
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
  const porAno: Record<number, { parcelas: number; total: number }> = {}
  todasParcelas.forEach(p => {
    const ano = p.vencimento.getFullYear()
    if (!porAno[ano]) porAno[ano] = { parcelas: 0, total: 0 }
    porAno[ano].parcelas++
    porAno[ano].total += p.valorParcela
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
router.get('/fluxo-diario/:clientId', async (req: Request, res: Response) => {
  const cid = req.params.clientId
  const saldoInicial = Number(req.query.saldoInicial ?? 0)

  const [contratos, despesas, receitas] = await Promise.all([
    prisma.agroContrato.findMany({ where: { clientId: cid } }),
    prisma.agroDespesa.findMany({ where: { clientId: cid } }),
    prisma.agroReceita.findMany({ where: { clientId: cid } }),
  ])

  const movimentos: Array<{
    data: Date; mov: string; tipo: string; origem: string; descricao: string; valor: number
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

  // Despesas
  despesas.forEach(d => {
    movimentos.push({
      data: d.data,
      mov: 'SAÍDA',
      tipo: d.tipo,
      origem: d.origem,
      descricao: d.descricao,
      valor: d.valor,
    })
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

  // Ordena por data
  movimentos.sort((a, b) => a.data.getTime() - b.data.getTime())

  // Calcula saldo corrente
  let saldo = saldoInicial
  const fluxo = movimentos.map(m => {
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

  const [contratos, despesas, receitas] = await Promise.all([
    prisma.agroContrato.findMany({ where: { clientId: cid } }),
    prisma.agroDespesa.findMany({ where: { clientId: cid } }),
    prisma.agroReceita.findMany({ where: { clientId: cid } }),
  ])

  const porMes: Record<string, { entradas: number; saidas: number }> = {}

  const addMes = (data: Date, tipo: 'entrada' | 'saida', valor: number) => {
    const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
    if (!porMes[key]) porMes[key] = { entradas: 0, saidas: 0 }
    if (tipo === 'entrada') porMes[key].entradas += valor
    else porMes[key].saidas += valor
  }

  contratos.flatMap(c => gerarParcelas(c)).forEach(p => addMes(p.vencimento, 'saida', p.valorParcela))
  despesas.forEach(d => addMes(d.data, 'saida', d.valor))
  receitas.forEach(r => addMes(r.data, 'entrada', r.valor))

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

export default router
