import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export interface ContratoExtrato {
  banco: string
  modalidade: string
  numeroContrato?: string
  dataContratacao: string
  valorTomado: number
  totalParcelas: number
  parcelaAtual: number
  periodicidade: string
  taxa: number
  vencimento: string
  valorParcela: number
  sistemaAmortizacao: string
  tomador?: string
  indexador?: string
  spreadIndexador?: number
}

const PROMPT = `Você é um especialista em extrair dados de contratos bancários rurais brasileiros de PDFs do Sicredi, Banco do Brasil e outros bancos.

Sua tarefa: extrair TODOS os contratos/operações de crédito presentes neste documento.

INSTRUÇÕES CRÍTICAS:
- Procure por TODOS os contratos, sem exceção. Pode haver 1 ou mais de 10 contratos no mesmo documento.
- Cada contrato pode ter: Título, Número, Contrato, Operação, Produto, Cédula, etc. como identificador
- Percorra o documento INTEIRO do início ao fim antes de responder

CAMPOS DE CADA CONTRATO:
- banco: nome do banco (ex: "Sicredi", "Banco do Brasil"). Se não explícito, extrair da razão social da instituição.
- modalidade: linha de crédito / produto (ex: "MODERFROTA", "FCO RURAL", "CUSTEIO AGRÍCOLA LCA", "CPR POUPANÇA PÓS", "EMPRÉSTIMO ROTATIVO", "PRC REPACTUAÇÃO")
- numeroContrato: código/número do título ou contrato (ex: "C00230421-6"). Obrigatório se presente.
- dataContratacao: data de contratação → formato YYYY-MM-DD
- valorTomado: valor original financiado/contratado (não o saldo atual). Campo: "Valor Financiado", "Valor do Contrato", "Valor Liberado"
- totalParcelas: número total de parcelas conforme o contrato. Campo: "Nro de Parcelas", "Prazo", "Parcelas"
- parcelaAtual: número da próxima parcela a vencer. Contar quantas parcelas têm status "Liquidado" ou "Pago" e somar 1. Se nenhuma está liquidada, usar 1.
- periodicidade: intervalo entre parcelas — "Mensal", "Semestral", "Trimestral" ou "Anual". Inferir pelo intervalo entre datas de vencimento das parcelas ou pelo prazo.
- taxa: taxa de juros ANUAL em formato decimal. Exemplos:
  * "8,5% a.a." → 0.085
  * "4,87% a.a." → 0.0487
  * "2,81% a.m." → converter para a.a.: (1+0.0281)^12-1 ≈ 0.3968 → 0.3968 (NÃO converter para percentual)
  * "0,5% a.m." → (1+0.005)^12-1 ≈ 0.0617 → 0.0617
- vencimento: data de vencimento da ÚLTIMA parcela → formato YYYY-MM-DD
- valorParcela: saldo devedor atual (valor total em aberto). Campo: "Saldo Devedor", "Saldo Atual", "Valor em Aberto"
- sistemaAmortizacao: "SAC" ou "Price". Para crédito rural, geralmente "SAC".
- tomador: nome do tomador se diferente do produtor principal

Retorne APENAS o JSON abaixo, sem nenhum texto antes ou depois:
{
  "contratos": [
    {
      "banco": "string",
      "modalidade": "string",
      "numeroContrato": "string",
      "dataContratacao": "YYYY-MM-DD",
      "valorTomado": number,
      "totalParcelas": number,
      "parcelaAtual": number,
      "periodicidade": "Mensal|Semestral|Trimestral|Anual",
      "taxa": number,
      "vencimento": "YYYY-MM-DD",
      "valorParcela": number,
      "sistemaAmortizacao": "SAC|Price",
      "tomador": "string ou null"
    }
  ]
}`

export async function parseContratos(buffer: Buffer): Promise<ContratoExtrato[]> {
  const base64 = buffer.toString('base64')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        },
        { type: 'text', text: PROMPT },
      ],
    }],
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  const jsonStr = raw.startsWith('{') ? raw : raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
  const parsed = JSON.parse(jsonStr) as { contratos: ContratoExtrato[] }
  return parsed.contratos ?? []
}
