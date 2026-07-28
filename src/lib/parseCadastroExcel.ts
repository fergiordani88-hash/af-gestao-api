import * as XLSX from 'xlsx'
import type { PatrimonioImport, ProducaoImport, CadastroParseResult } from './parseCadastroProdutor'
import type { ContratoExtrato } from './parseContratos'

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeHeader(h: any): string {
  return String(h ?? '').toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 .]/g, '').trim()
}

function parseDate(val: any): string {
  if (!val) return ''
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const s = String(val).trim()
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  return ''
}

function parseNum(val: any): number {
  if (typeof val === 'number') return val
  const s = String(val ?? '').replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(s) || 0
}

function parseTaxa(val: any): number {
  let n = parseNum(val)
  if (n > 1) n = n / 100
  return n
}

function parsePeriodicidade(val: any): string {
  const s = String(val ?? '').toLowerCase()
  if (s.includes('mensal') || s === 'm') return 'Mensal'
  if (s.includes('semest')) return 'Semestral'
  if (s.includes('trimes')) return 'Trimestral'
  if (s.includes('anual') || s.includes('ano') || s === 'a') return 'Anual'
  if (s.includes('unico') || s.includes('único')) return 'Único'
  return 'Anual'
}

function parseBool(val: any): boolean {
  if (typeof val === 'boolean') return val
  const s = String(val ?? '').toLowerCase()
  return ['sim', 'yes', 'true', '1', 'x', 'alienado'].includes(s)
}

function sheetToRows(ws: XLSX.WorkSheet): { headers: string[]; rows: Record<string, any>[] } {
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (raw.length < 2) return { headers: [], rows: [] }

  // Encontra linha de cabeçalho
  let hi = 0
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    if (raw[i].filter((c: any) => String(c).trim()).length >= 2) { hi = i; break }
  }
  const headers = raw[hi].map(normalizeHeader)
  const rows: Record<string, any>[] = []
  for (let r = hi + 1; r < raw.length; r++) {
    const row = raw[r]
    if (row.every((c: any) => String(c).trim() === '')) continue
    const obj: Record<string, any> = {}
    headers.forEach((h, i) => { if (h) obj[h] = row[i] })
    rows.push(obj)
  }
  return { headers, rows }
}

// ── Detectores de tipo de planilha ────────────────────────────────────────────

const PAT_KEYS = ['descricao', 'valor avaliado', 'categoria', 'valor alienacao', 'ônus', 'onus', 'matricula', 'benfeitoria', 'especif', 'gravame', 'valor r']
const PROD_KEYS = ['safra', 'cultura', 'produtividade', 'area', 'cotacao', 'custo por ha', 'sc/ha']
const CONT_KEYS = ['banco', 'modalidade', 'taxa', 'vencimento', 'parcelas', 'valor tomado', 'contrato']

function scoreSheet(headers: string[], keys: string[]): number {
  return keys.filter(k => headers.some(h => h.includes(k))).length
}

// ── Parsers por tipo ──────────────────────────────────────────────────────────

const CAT_MAP: Record<string, PatrimonioImport['categoria']> = {
  'maquina': 'Máquinas', 'maquinas': 'Máquinas', 'trator': 'Máquinas', 'colheitadeira': 'Máquinas',
  'plantadora': 'Máquinas', 'semeadora': 'Máquinas', 'pulverizador': 'Máquinas',
  'plataforma': 'Máquinas', 'escarificador': 'Máquinas', 'implemento': 'Máquinas',
  'equipamento': 'Equipamentos', 'equipamentos': 'Equipamentos',
  'gerador': 'Equipamentos', 'solar': 'Equipamentos', 'fotovoltaico': 'Equipamentos',
  'irrigacao': 'Equipamentos', 'irrigação': 'Equipamentos', 'usina': 'Equipamentos',
  'tratador': 'Equipamentos',
  'veiculo': 'Veículos', 'veiculos': 'Veículos', 'caminhao': 'Veículos', 'automovel': 'Veículos',
  'carregadeira': 'Máquinas',
  'imovel rural': 'Imóveis rurais', 'imoveis rurais': 'Imóveis rurais', 'fazenda': 'Imóveis rurais',
  'imovel urbano': 'Imóveis urbanos', 'imoveis urbanos': 'Imóveis urbanos',
}

function parseCategoria(val: any): PatrimonioImport['categoria'] {
  const s = normalizeHeader(String(val ?? ''))
  for (const [k, v] of Object.entries(CAT_MAP)) {
    if (s.includes(k)) return v
  }
  const valid: PatrimonioImport['categoria'][] = ['Máquinas', 'Equipamentos', 'Veículos', 'Imóveis rurais', 'Imóveis urbanos', 'Outros']
  const match = valid.find(v => normalizeHeader(v) === s)
  return match ?? 'Outros'
}

function parseCategoriaFromDesc(desc: string): PatrimonioImport['categoria'] {
  const s = normalizeHeader(desc)
  for (const [k, v] of Object.entries(CAT_MAP)) {
    if (s.includes(k)) return v
  }
  return 'Máquinas'
}

function parseOnus(val: any): boolean {
  if (typeof val === 'boolean') return val
  const s = String(val ?? '').toLowerCase().trim()
  if (!s || s === 'sem gravame' || s === 'nao' || s === 'não' || s === 'no' || s === 'false' || s === '0') return false
  return s.length > 0
}

function pick(row: Record<string, any>, ...keys: string[]): any {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.includes(k) || k.includes(rk)) {
        const v = row[rk]
        if (v !== '' && v !== null && v !== undefined) return v
      }
    }
  }
  return undefined
}

function parsePatrimonioRows(rows: Record<string, any>[]): PatrimonioImport[] {
  return rows.map(row => {
    // Suporta colunas padrão E colunas do formato real (Especificação, Marca, Modelo, etc.)
    const especif  = String(pick(row, 'especificacao', 'especif', 'descricao', 'nome', 'bem', 'item', 'denominacao') ?? '').trim()
    const marca    = String(pick(row, 'marca', 'fabricante') ?? '').trim()
    const modelo   = String(pick(row, 'modelo') ?? '').trim()
    const ano      = pick(row, 'ano', 'ano fabric')
    const anoStr   = ano ? ` (${ano})` : ''

    // Monta descrição combinando especificação + marca + modelo
    let descricao = especif
    if (marca && marca !== '-') descricao += (descricao ? ' ' : '') + marca
    if (modelo && modelo !== '-') descricao += (descricao ? ' ' : '') + modelo
    descricao = descricao.trim() || 'Sem descrição'
    descricao += anoStr

    // Categoria: tenta campo direto, senão detecta pela descrição
    const catRaw = pick(row, 'categoria', 'classificacao')
    const categoria = catRaw
      ? parseCategoria(catRaw)
      : parseCategoriaFromDesc(especif)

    // Ônus: suporta "Tipo de Gravame" (Sem gravame / Financiado) e campo booleano
    const gravameVal = pick(row, 'tipo de gravame', 'gravame', 'tipo gravame', 'tipo onus')
    const onusBool   = pick(row, 'onus', 'alienado', 'possui onus', 'alienacao')
    const possuiOnus = gravameVal !== undefined ? parseOnus(gravameVal) : parseBool(onusBool)
    const tipoOnusStr = gravameVal
      ? (String(gravameVal).toLowerCase() === 'sem gravame' ? undefined : String(gravameVal).trim())
      : (String(pick(row, 'tipo onus', 'tipo alienacao', 'tipo garantia') ?? '').trim() || undefined)

    return {
      categoria,
      descricao,
      identificacao: String(pick(row, 'identificacao', 'serie', 'matricula de localizacao', 'matricula', 'placa', 'chassi', 'id') ?? '').trim() || undefined,
      valorAvaliado: parseNum(pick(row, 'valor r', 'valor avaliado', 'valor', 'avaliacao', 'preco')),
      possuiOnus,
      tipoOnus:  tipoOnusStr,
      credor:    String(pick(row, 'instituicao', 'instituição', 'credor', 'banco credor', 'financiador') ?? '').trim() || undefined,
      valorOnus: parseNum(pick(row, 'valor a pagar', 'valor onus', 'valor alienacao', 'valor garantia')),
      obs:       String(pick(row, 'obs', 'observacao', 'observacoes', 'nota', 'estado') ?? '').trim() || undefined,
    }
  }).filter(p => p.descricao !== 'Sem descrição' || p.valorAvaliado > 0)
}

function parseProducaoRows(rows: Record<string, any>[]): ProducaoImport[] {
  return rows.map(row => ({
    safra:         String(pick(row, 'safra', 'ano safra', 'periodo') ?? '').trim() || '2025/26',
    cultura:       String(pick(row, 'cultura', 'produto', 'grao', 'crop') ?? '').trim() || 'Soja',
    area:          parseNum(pick(row, 'area', 'area ha', 'hectares', 'ha')),
    produtividade: parseNum(pick(row, 'produtividade', 'produt', 'sc ha', 'sc/ha', 'yield')),
    cotacao:       parseNum(pick(row, 'cotacao', 'preco', 'valor sc', 'r$/sc', 'price')),
    custoPorHa:    parseNum(pick(row, 'custo por ha', 'custo ha', 'custo/ha', 'cost ha')),
    areaArrendada: parseNum(pick(row, 'area arrendada', 'arrendamento', 'aluguel ha')),
    custoArrendHa: parseNum(pick(row, 'custo arrend', 'custo arrendamento', 'arrend/ha')),
  })).filter(p => p.area > 0 || p.safra !== '2025/26')
}

function parseContratosRows(rows: Record<string, any>[]): ContratoExtrato[] {
  return rows.map(row => ({
    banco:              String(pick(row, 'banco', 'instituicao', 'credor', 'fonte') ?? 'Não informado').trim(),
    modalidade:         String(pick(row, 'modalidade', 'produto', 'linha', 'tipo') ?? 'Crédito Rural').trim(),
    numeroContrato:     String(pick(row, 'contrato', 'numero', 'titulo', 'cedula', 'operacao') ?? '').trim() || undefined,
    dataContratacao:    parseDate(pick(row, 'data contratacao', 'contratacao', 'data contrato', 'emissao')),
    valorTomado:        parseNum(pick(row, 'valor tomado', 'valor financiado', 'principal', 'valor contrato')),
    totalParcelas:      Math.round(parseNum(pick(row, 'total parcelas', 'parcelas', 'prazo', 'nro parcelas'))) || 1,
    parcelaAtual:       Math.round(parseNum(pick(row, 'parcela atual', 'proxima parcela', 'parc atual'))) || 1,
    periodicidade:      parsePeriodicidade(pick(row, 'periodicidade', 'frequencia', 'periodo')),
    taxa:               parseTaxa(pick(row, 'taxa', 'juros', 'taxa juros', 'taxa aa', 'taxa a.a.')),
    vencimento:         parseDate(pick(row, 'vencimento', 'venc', 'data vencimento', 'ultimo vencimento')),
    valorParcela:       parseNum(pick(row, 'valor parcela', 'saldo devedor', 'saldo', 'prestacao')),
    sistemaAmortizacao: String(pick(row, 'amortizacao', 'sistema', 'sistema amortizacao') ?? 'SAC').toUpperCase().includes('PRICE') ? 'Price' : 'SAC',
    tomador:            String(pick(row, 'tomador', 'devedor', 'nome tomador') ?? '').trim() || undefined,
  })).filter(c => c.banco !== 'Não informado' || c.valorTomado > 0)
}

// ── Exportação pública ────────────────────────────────────────────────────────

export interface CadastroExcelResult extends CadastroParseResult {
  contratos: ContratoExtrato[]
}

export function parseCadastroExcel(buffer: Buffer): CadastroExcelResult {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false })

  let patrimonio: PatrimonioImport[] = []
  let producao: ProducaoImport[] = []
  let contratos: ContratoExtrato[] = []

  for (const sheetName of wb.SheetNames) {
    const { headers, rows } = sheetToRows(wb.Sheets[sheetName])
    if (rows.length === 0) continue

    const nameNorm = normalizeHeader(sheetName)
    const scorePat  = scoreSheet(headers, PAT_KEYS)
    const scoreProd = scoreSheet(headers, PROD_KEYS)
    const scoreCont = scoreSheet(headers, CONT_KEYS)

    // Prioridade: nome da aba, depois score de colunas
    const isPatrimonio = nameNorm.includes('patrim') || (scorePat >= 2 && scorePat >= scoreProd && scorePat >= scoreCont)
    const isProducao   = nameNorm.includes('prod') || nameNorm.includes('renda') || nameNorm.includes('safra') ||
                         (scoreProd >= 2 && scoreProd > scorePat && scoreProd >= scoreCont)
    const isContrato   = nameNorm.includes('contrat') || nameNorm.includes('credito') || nameNorm.includes('financ') ||
                         (scoreCont >= 2 && scoreCont >= scorePat && scoreCont >= scoreProd)

    if (isPatrimonio && !isProducao && !isContrato) patrimonio = [...patrimonio, ...parsePatrimonioRows(rows)]
    else if (isProducao && !isPatrimonio && !isContrato) producao = [...producao, ...parseProducaoRows(rows)]
    else if (isContrato) contratos = [...contratos, ...parseContratosRows(rows)]
    else if (scorePat >= scoreProd && scorePat >= scoreCont && scorePat >= 2) patrimonio = [...patrimonio, ...parsePatrimonioRows(rows)]
    else if (scoreProd >= scoreCont && scoreProd >= 2) producao = [...producao, ...parseProducaoRows(rows)]
    else if (scoreCont >= 2) contratos = [...contratos, ...parseContratosRows(rows)]
  }

  return { patrimonio, producao, contratos }
}
