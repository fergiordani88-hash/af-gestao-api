import * as XLSX from 'xlsx'
import type { ContratoExtrato } from './parseContratos'

// Mapeia possíveis nomes de coluna para campos do contrato
const COL_MAP: Record<string, keyof ContratoExtrato> = {
  // banco
  'banco': 'banco', 'bank': 'banco', 'instituição': 'banco', 'instituicao': 'banco',
  'credor': 'banco', 'fonte': 'banco',
  // modalidade
  'modalidade': 'modalidade', 'produto': 'modalidade', 'linha': 'modalidade',
  'tipo': 'modalidade', 'product': 'modalidade', 'linha de crédito': 'modalidade',
  // numeroContrato
  'contrato': 'numeroContrato', 'número': 'numeroContrato', 'numero': 'numeroContrato',
  'nº contrato': 'numeroContrato', 'no contrato': 'numeroContrato',
  'número do contrato': 'numeroContrato', 'numero do contrato': 'numeroContrato',
  'título': 'numeroContrato', 'titulo': 'numeroContrato', 'cédula': 'numeroContrato',
  'cedula': 'numeroContrato', 'operação': 'numeroContrato', 'operacao': 'numeroContrato',
  // dataContratacao
  'data contratação': 'dataContratacao', 'data contratacao': 'dataContratacao',
  'contratação': 'dataContratacao', 'contratacao': 'dataContratacao',
  'data do contrato': 'dataContratacao', 'data emissão': 'dataContratacao',
  'data emissao': 'dataContratacao', 'emissão': 'dataContratacao',
  // valorTomado
  'valor tomado': 'valorTomado', 'valor financiado': 'valorTomado',
  'valor contrato': 'valorTomado', 'valor do contrato': 'valorTomado',
  'principal': 'valorTomado', 'valor liberado': 'valorTomado',
  'valor original': 'valorTomado', 'montante': 'valorTomado',
  // totalParcelas
  'total parcelas': 'totalParcelas', 'total de parcelas': 'totalParcelas',
  'parcelas': 'totalParcelas', 'prazo': 'totalParcelas', 'nro parcelas': 'totalParcelas',
  'nº parcelas': 'totalParcelas', 'quantidade parcelas': 'totalParcelas',
  // parcelaAtual
  'parcela atual': 'parcelaAtual', 'parcela nº': 'parcelaAtual',
  'parcela no': 'parcelaAtual', 'parc atual': 'parcelaAtual',
  'próxima parcela': 'parcelaAtual', 'proxima parcela': 'parcelaAtual',
  // periodicidade
  'periodicidade': 'periodicidade', 'frequência': 'periodicidade',
  'frequencia': 'periodicidade', 'período': 'periodicidade', 'periodo': 'periodicidade',
  // taxa
  'taxa': 'taxa', 'juros': 'taxa', 'taxa juros': 'taxa', 'taxa de juros': 'taxa',
  'taxa nominal': 'taxa', 'taxa aa': 'taxa', 'taxa a.a': 'taxa', 'taxa a.a.': 'taxa',
  'juros aa': 'taxa', 'juros a.a.': 'taxa',
  // vencimento
  'vencimento': 'vencimento', 'venc': 'vencimento', 'data vencimento': 'vencimento',
  'data de vencimento': 'vencimento', 'último vencimento': 'vencimento',
  'ultimo vencimento': 'vencimento', 'vencimento final': 'vencimento',
  // valorParcela
  'valor parcela': 'valorParcela', 'valor da parcela': 'valorParcela',
  'parcela': 'valorParcela', 'prestação': 'valorParcela', 'prestacao': 'valorParcela',
  'saldo devedor': 'valorParcela', 'saldo': 'valorParcela',
  // sistemaAmortizacao
  'amortização': 'sistemaAmortizacao', 'amortizacao': 'sistemaAmortizacao',
  'sistema amortização': 'sistemaAmortizacao', 'sistema amortizacao': 'sistemaAmortizacao',
  'sistema': 'sistemaAmortizacao',
  // tomador
  'tomador': 'tomador', 'devedor': 'tomador', 'cliente': 'tomador',
  'nome tomador': 'tomador', 'razão social': 'tomador',
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-z0-9 .]/g, '')
    .trim()
}

function parseDate(val: any): string {
  if (!val) return ''
  // Número serial do Excel
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const s = String(val).trim()
  // Formatos: DD/MM/YYYY ou YYYY-MM-DD
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  return ''
}

function parseNumber(val: any): number {
  if (typeof val === 'number') return val
  const s = String(val ?? '').replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(s) || 0
}

function parseTaxa(val: any): number {
  let n = parseNumber(val)
  // Se veio como percentual (ex: 8.5 para 8,5%), converte para decimal
  if (n > 1) n = n / 100
  return n
}

function parsePeriodicidade(val: any): string {
  const s = String(val ?? '').toLowerCase()
  if (s.includes('mensal') || s.includes('month') || s === 'm') return 'Mensal'
  if (s.includes('semest') || s.includes('biannu')) return 'Semestral'
  if (s.includes('trimes') || s.includes('quarter')) return 'Trimestral'
  if (s.includes('anual') || s.includes('annual') || s.includes('ano') || s === 'a') return 'Anual'
  if (s.includes('único') || s.includes('unico') || s.includes('bullet')) return 'Único'
  return 'Anual' // default para crédito rural
}

function parseSistemaAmort(val: any): string {
  const s = String(val ?? '').toUpperCase()
  if (s.includes('SAC') || s.includes('AMORT')) return 'SAC'
  if (s.includes('PRICE') || s.includes('FRANC') || s.includes('FIX')) return 'Price'
  return 'SAC'
}

export function parseContratosExcel(buffer: Buffer): ContratoExtrato[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const contratos: ContratoExtrato[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    if (rows.length < 2) continue

    // Encontra a linha de cabeçalho (primeira com múltiplos valores não vazios)
    let headerIdx = 0
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const nonEmpty = rows[i].filter(c => String(c).trim().length > 0).length
      if (nonEmpty >= 3) { headerIdx = i; break }
    }

    const headers = rows[headerIdx].map((h: any) => normalizeHeader(String(h)))
    const fieldMap: Record<number, keyof ContratoExtrato> = {}
    headers.forEach((h, idx) => {
      const field = COL_MAP[h]
      if (field && !(idx in fieldMap)) fieldMap[idx] = field
    })

    if (Object.keys(fieldMap).length < 2) continue // planilha sem colunas reconhecidas

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r]
      if (!row || row.every((c: any) => String(c).trim() === '')) continue

      const raw: any = {}
      Object.entries(fieldMap).forEach(([colIdx, field]) => {
        raw[field] = row[Number(colIdx)]
      })

      // Pula linhas claramente inválidas
      if (!raw.banco && !raw.valorTomado && !raw.modalidade) continue

      contratos.push({
        banco:               String(raw.banco ?? 'Não informado').trim() || 'Não informado',
        modalidade:          String(raw.modalidade ?? 'Crédito Rural').trim() || 'Crédito Rural',
        numeroContrato:      raw.numeroContrato ? String(raw.numeroContrato).trim() : undefined,
        dataContratacao:     parseDate(raw.dataContratacao),
        valorTomado:         parseNumber(raw.valorTomado),
        totalParcelas:       Math.round(parseNumber(raw.totalParcelas)) || 1,
        parcelaAtual:        Math.round(parseNumber(raw.parcelaAtual)) || 1,
        periodicidade:       parsePeriodicidade(raw.periodicidade),
        taxa:                parseTaxa(raw.taxa),
        vencimento:          parseDate(raw.vencimento),
        valorParcela:        parseNumber(raw.valorParcela),
        sistemaAmortizacao:  parseSistemaAmort(raw.sistemaAmortizacao),
        tomador:             raw.tomador ? String(raw.tomador).trim() : undefined,
      })
    }
  }

  return contratos
}
