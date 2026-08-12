import * as XLSX from 'xlsx'
import type { ContratoExtrato } from './parseContratos'

// Campos extras usados internamente durante o parse (não fazem parte de ContratoExtrato)
interface RawContrato extends ContratoExtrato {
  _parcelaAtualStr?: string  // "2/3" format from "Próxima parcela (nº/total)"
  _parcelasRestantes?: number
  _saldoDevedor?: number
}

// Mapeia possíveis nomes de coluna para campos do contrato
const COL_MAP: Record<string, keyof RawContrato> = {
  // banco
  'banco': 'banco', 'bank': 'banco', 'instituicao': 'banco',
  'credor': 'banco', 'fonte': 'banco', 'bancoif': 'banco',
  // modalidade
  'modalidade': 'modalidade', 'produto': 'modalidade', 'linha': 'modalidade',
  'tipo': 'modalidade', 'product': 'modalidade', 'linha de credito': 'modalidade',
  'produtomodalidade': 'modalidade', 'produto modalidade': 'modalidade',
  // numeroContrato
  'contrato': 'numeroContrato', 'numero': 'numeroContrato',
  'n contrato': 'numeroContrato', 'no contrato': 'numeroContrato',
  'numero do contrato': 'numeroContrato',
  'titulo': 'numeroContrato', 'cedula': 'numeroContrato',
  'operacao': 'numeroContrato',
  // dataContratacao
  'data contratacao': 'dataContratacao',
  'contratacao': 'dataContratacao',
  'data do contrato': 'dataContratacao', 'data emissao': 'dataContratacao',
  'emissao': 'dataContratacao',
  // valorTomado
  'valor tomado': 'valorTomado', 'valor financiado': 'valorTomado',
  'valor contrato': 'valorTomado', 'valor do contrato': 'valorTomado',
  'principal': 'valorTomado', 'valor liberado': 'valorTomado',
  'valor original': 'valorTomado', 'montante': 'valorTomado',
  // totalParcelas
  'total parcelas': 'totalParcelas', 'total de parcelas': 'totalParcelas',
  'parcelas': 'totalParcelas', 'prazo': 'totalParcelas', 'nro parcelas': 'totalParcelas',
  'quantidade parcelas': 'totalParcelas',
  'qtde total de parcelas': 'totalParcelas',
  'total parc.': 'totalParcelas',  // header gerado por exportarCSV (TabContratos.tsx)
  // parcelaAtual
  'parcela atual': 'parcelaAtual', 'parc atual': 'parcelaAtual',
  'parc. atual': 'parcelaAtual',  // header gerado por exportarCSV (TabContratos.tsx)
  // "Próxima parcela (nº/total)" → "proxima parcela ntotal" após normalização
  'proxima parcela ntotal': '_parcelaAtualStr',
  // parcelas restantes (para calcular parcelaAtual = total - restantes + 1)
  'parcelas restantes': '_parcelasRestantes',
  // periodicidade
  'periodicidade': 'periodicidade', 'frequencia': 'periodicidade',
  'periodo': 'periodicidade',
  // taxa nominal / spread
  'taxa': 'taxa', 'juros': 'taxa', 'taxa juros': 'taxa', 'taxa de juros': 'taxa',
  'taxa nominal': 'taxa', 'taxa aa': 'taxa', 'taxa a.a': 'taxa', 'taxa a.a.': 'taxa',
  'juros aa': 'taxa', 'juros a.a.': 'taxa',
  'taxa contratada': 'taxa',  // planilha Carteira Consolidada (é o spread para pós-fixados)
  'taxa nominal aa': 'taxa',  // header "Taxa Nominal (%aa)" gerado por exportarCSV (TabContratos.tsx)
  'taxa a.a. equiv.': 'taxa', // coluna ja anualizada e numerica - preferida sobre "Taxa" (texto livre "5.23% a.a.")
  // indexador
  'indexador': 'indexador',
  // vencimento
  'vencimento': 'vencimento', 'venc': 'vencimento', 'data vencimento': 'vencimento',
  'data de vencimento': 'vencimento', 'ultimo vencimento': 'vencimento',
  'vencimento final': 'vencimento', 'prox. vencimento': 'vencimento', 'proximo vencimento': 'vencimento',
  // valorParcela — "Próxima parcela" (valor numérico) é a parcela; saldo devedor vai em _saldoDevedor
  'valor parcela': 'valorParcela', 'valor da parcela': 'valorParcela',
  'prestacao': 'valorParcela',
  'proxima parcela': 'valorParcela',   // valor numérico da próxima parcela
  'parc. nominal': 'valorParcela',     // header gerado por exportarCSV (TabContratos.tsx)
  'saldo devedor': '_saldoDevedor',    // não é valorParcela — armazena à parte
  'saldo': '_saldoDevedor',
  // sistemaAmortizacao
  'amortizacao': 'sistemaAmortizacao',
  'sistema amortizacao': 'sistemaAmortizacao',
  'sistema': 'sistemaAmortizacao',
  // tomador
  'tomador': 'tomador', 'devedor': 'tomador', 'cliente': 'tomador',
  'nome tomador': 'tomador', 'razao social': 'tomador',
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/r\$/g, '') // remove marcador de moeda "R$" (ex: "Saldo Devedor (R$)" -> "saldo devedor")
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
  let s = String(val ?? '').replace(/[R$\s]/g, '')
  // Só assume formato brasileiro (1.234,56 -> milhar+decimal) quando ha VIRGULA de fato.
  // Sem virgula, o ponto (se houver) e decimal (ex: "5.23% a.a." vindo de planilha
  // gerada em Python/Excel en-US) - remover o ponto ali corrompia a taxa em ~100x.
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  }
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
    const fieldMap: Record<number, keyof RawContrato> = {}
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

      // Calcula parcelaAtual:
      // 1) campo direto, ou
      // 2) string "2/3" → extrai o numerador, ou
      // 3) totalParcelas - parcelasRestantes + 1
      let parcelaAtual = Math.round(parseNumber(raw.parcelaAtual)) || 0
      if (!parcelaAtual && raw._parcelaAtualStr) {
        const m = String(raw._parcelaAtualStr).match(/^(\d+)\//)
        if (m) parcelaAtual = Number(m[1])
      }
      let totalParcelas = Math.round(parseNumber(raw.totalParcelas)) || 0
      if (!totalParcelas && raw._parcelaAtualStr) {
        const m = String(raw._parcelaAtualStr).match(/\/(\d+)$/)
        if (m) totalParcelas = Number(m[1])
      }
      if (!parcelaAtual && totalParcelas && raw._parcelasRestantes) {
        parcelaAtual = totalParcelas - Math.round(parseNumber(raw._parcelasRestantes)) + 1
      }
      // Planilha só tem "parcelas restantes" (sem total) — melhor aproximação possível é
      // tratar as restantes como o total ainda a pagar e parcelaAtual=1, em vez de 1/1 fixo.
      if (!totalParcelas && !parcelaAtual && raw._parcelasRestantes) {
        totalParcelas = Math.round(parseNumber(raw._parcelasRestantes)) || 0
        if (totalParcelas) parcelaAtual = 1
      }

      // valorParcela: usa "Próxima parcela" (numérica). Se não veio, cai para saldo devedor como fallback.
      const saldoDevedor = parseNumber(raw._saldoDevedor)
      const valorParcela = parseNumber(raw.valorParcela) || saldoDevedor

      // Valor tomado: usa "Valor original". Se vazio/zero, usa saldo devedor (CPR, bullet, sem histórico)
      const valorTomado = parseNumber(raw.valorTomado) || saldoDevedor

      // Indexador: "mensal" indica taxa expressa ao mês (não é indexador pós-fixado)
      const indexadorRaw = raw.indexador ? String(raw.indexador).trim().toLowerCase() : ''
      const isTaxaMensal = indexadorRaw === 'mensal'

      // Periodicidade: detecta pelo nome da modalidade, pela coluna, ou pelo indexador "mensal"
      const periodicidadeRaw = parsePeriodicidade(raw.periodicidade)
      // Se indexador = "mensal" OU totalParcelas >= 12 com dado mensal → força Mensal
      const periodicidade = isTaxaMensal ? 'Mensal' : periodicidadeRaw

      // Indexador e spread: "Taxa contratada" é o spread para pós-fixados; "mensal" não é indexador
      const indexador = (!isTaxaMensal && raw.indexador) ? String(raw.indexador).trim() : undefined
      const taxaRaw = parseTaxa(raw.taxa)
      // Compara ignorando acento/hífen/caixa: fontes variam entre "Pré-fixado", "Prefixado", "PREFIXADO" etc.
      const indexadorNorm = (indexador ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()
      const isPosFix = !!indexador && indexadorNorm !== 'prefixado'

      // Para taxa mensal: converte para taxa anual efetiva → (1 + i_mensal)^12 - 1
      const taxaAnual = isTaxaMensal ? Math.pow(1 + taxaRaw, 12) - 1 : taxaRaw
      const taxa = isPosFix ? 0 : taxaAnual
      const spreadIndexador = isPosFix ? taxaRaw : 0

      // sistemaAmortizacao: pós-fixados sempre SAC; senão detecta pelo nome da modalidade
      const modalidadeStr = String(raw.modalidade ?? '').toUpperCase()
      const sistemaRaw = raw.sistemaAmortizacao
        ? parseSistemaAmort(raw.sistemaAmortizacao)
        : (isPosFix || modalidadeStr.includes('SAC') ? 'SAC' : 'Price')

      contratos.push({
        banco:               String(raw.banco ?? 'Não informado').trim() || 'Não informado',
        modalidade:          String(raw.modalidade ?? 'Crédito Rural').trim() || 'Crédito Rural',
        numeroContrato:      raw.numeroContrato ? String(raw.numeroContrato).trim() : undefined,
        dataContratacao:     parseDate(raw.dataContratacao),
        valorTomado,
        totalParcelas:       totalParcelas || 1,
        parcelaAtual:        parcelaAtual || 1,
        periodicidade,
        taxa,
        vencimento:          parseDate(raw.vencimento),
        valorParcela,
        sistemaAmortizacao:  sistemaRaw,
        tomador:             raw.tomador ? String(raw.tomador).trim() : undefined,
        indexador:           indexador || undefined,
        spreadIndexador:     spreadIndexador || undefined,
      })
    }
  }

  return contratos
}
