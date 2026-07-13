// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

export interface ContractFields {
  banco?: string
  numeroContrato?: string
  modalidade?: string
  dataContratacao?: string
  vencimento?: string
  valorTomado?: number
  valorParcela?: number
  totalParcelas?: number
  taxa?: number
  periodicidade?: string
  obs?: string
  rawText?: string
}

function clean(s: string) { return s.replace(/\s+/g, ' ').trim() }

function parseBRL(s: string): number | undefined {
  const m = s.match(/[\d.,]+/)
  if (!m) return undefined
  const n = m[0].replace(/\./g, '').replace(',', '.')
  const v = parseFloat(n)
  return isNaN(v) ? undefined : v
}

function parseDate(s: string): string | undefined {
  // dd/mm/yyyy or dd.mm.yyyy
  const m = s.match(/(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  // yyyy-mm-dd
  const m2 = s.match(/(\d{4})[\/\.\-](\d{2})[\/\.\-](\d{2})/)
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`
  return undefined
}

function detectBanco(text: string): string | undefined {
  const bancos: Record<string, string[]> = {
    'SICOOB': ['sicoob', 'cooperativa de crédito', 'credcooper'],
    'SICREDI': ['sicredi'],
    'Banco do Brasil': ['banco do brasil', 'b.b.', 'agência bb'],
    'Bradesco': ['bradesco'],
    'Itaú': ['itaú', 'itau'],
    'Caixa Econômica Federal': ['caixa econômica', 'cef'],
    'Santander': ['santander'],
    'BNB': ['banco do nordeste', 'bnb'],
    'BNDES': ['bndes'],
    'BRB': ['brb'],
    'Banrisul': ['banrisul'],
    'Rabobank': ['rabobank'],
    'Viacredi': ['viacredi'],
    'Cresol': ['cresol'],
    'Unicred': ['unicred'],
  }
  const lower = text.toLowerCase()
  for (const [nome, keywords] of Object.entries(bancos)) {
    if (keywords.some(k => lower.includes(k))) return nome
  }
  return undefined
}

function detectModalidade(text: string): string | undefined {
  const lower = text.toLowerCase()
  if (lower.includes('custeio')) return 'Custeio'
  if (lower.includes('pronamp')) return 'Pronamp'
  if (lower.includes('pronaf')) return 'Pronaf'
  if (lower.includes('moderfrota')) return 'Moderfrota'
  if (lower.includes('finame')) return 'BNDES Finame'
  if (lower.includes('bndes')) return 'BNDES Finame'
  if (lower.includes('cpr')) return 'CPR'
  if (lower.includes('investimento')) return 'Investimento'
  if (lower.includes('capital de giro') || lower.includes('giro')) return 'Capital de giro'
  if (lower.includes('repactu')) return 'Repactuação'
  return undefined
}

function detectPeriodicidade(text: string): string | undefined {
  const lower = text.toLowerCase()
  if (lower.includes('mensal') || lower.includes('mês')) return 'Mensal'
  if (lower.includes('semestral')) return 'Semestral'
  if (lower.includes('trimestral')) return 'Trimestral'
  if (lower.includes('anual') || lower.includes('ano')) return 'Anual'
  if (lower.includes('única') || lower.includes('unica') || lower.includes('único')) return 'Único'
  return undefined
}

export async function parsePdfContract(buffer: Buffer): Promise<ContractFields> {
  const data = await pdfParse(buffer)
  const text = clean(data.text)
  const result: ContractFields = { rawText: text.substring(0, 2000) }

  // Banco
  result.banco = detectBanco(text)

  // Modalidade
  result.modalidade = detectModalidade(text)

  // Periodicidade
  result.periodicidade = detectPeriodicidade(text)

  // Número do contrato
  const numContrato = text.match(/(?:n[oº°\.]\s*(?:do\s*)?contrato|contrato\s*n[oº°\.]|cédula\s*n[oº°\.])\s*[:\-]?\s*([\d\.\-\/]+)/i)
  if (numContrato) result.numeroContrato = numContrato[1].trim()

  // Data de contratação (busca a primeira data associada a "contratação", "emissão", "celebrado")
  const datePatterns = [
    /(?:data\s*de\s*contrata[çc][aã]o|contratado\s*em|emitido\s*em|celebrado\s*em|data\s*de\s*emiss[aã]o)\s*[:\-]?\s*(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})/i,
    /(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})/,
  ]
  for (const p of datePatterns) {
    const m = text.match(p)
    if (m) { result.dataContratacao = parseDate(m[1]); break }
  }

  // Vencimento
  const vencMatch = text.match(/(?:vencimento|vence\s*em|data\s*de\s*vencimento|[uú]ltima\s*parcela)\s*[:\-]?\s*(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})/i)
  if (vencMatch) result.vencimento = parseDate(vencMatch[1])

  // Valor tomado
  const valorPatterns = [
    /(?:valor\s*(?:total\s*)?(?:do\s*)?(?:contrato|financiado|liberado|empréstimo|principal|cr[eé]dito))\s*[:\-]?\s*R?\$?\s*([\d\.,]+)/i,
    /(?:quantia\s*de|no\s*valor\s*de)\s*R?\$?\s*([\d\.,]+)/i,
    /R\$\s*([\d\.,]+)/,
  ]
  for (const p of valorPatterns) {
    const m = text.match(p)
    if (m) { result.valorTomado = parseBRL(m[1]); break }
  }

  // Valor da parcela
  const parcelaValorMatch = text.match(/(?:valor\s*da\s*parcela|cada\s*parcela|parcela\s*de)\s*[:\-]?\s*R?\$?\s*([\d\.,]+)/i)
  if (parcelaValorMatch) result.valorParcela = parseBRL(parcelaValorMatch[1])

  // Total de parcelas
  const parcelasMatch = text.match(/(\d+)\s*(?:parcelas?|presta[çc][oõ]es?|pagamentos?)\s*(?:mensais?|semestrais?|anuais?)?/i)
  if (parcelasMatch) result.totalParcelas = parseInt(parcelasMatch[1])

  // Taxa de juros
  const taxaMatch = text.match(/taxa\s*(?:de\s*juros?)?\s*[:\-]?\s*([\d,\.]+)\s*%\s*(?:a\.?[mM]\.?|ao\s*m[eê]s)?/i)
  if (taxaMatch) {
    const t = parseFloat(taxaMatch[1].replace(',', '.'))
    // Convert to decimal if percentage > 1
    result.taxa = t > 1 ? t / 100 : t
  }

  return result
}
