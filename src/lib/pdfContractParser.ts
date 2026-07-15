import Anthropic from '@anthropic-ai/sdk'

export interface ContractFields {
  banco?: string
  numeroContrato?: string
  modalidade?: string
  dataContratacao?: string   // YYYY-MM-DD
  vencimento?: string        // YYYY-MM-DD
  valorTomado?: number
  valorParcela?: number
  totalParcelas?: number
  taxa?: number              // decimal anual, ex: 0.095
  periodicidade?: string
  obs?: string
  contratos?: ContractFields[] // múltiplos contratos em um PDF
}

const PROMPT = `Você é um especialista em análise de contratos bancários brasileiros.
Analise o PDF enviado e extraia TODOS os contratos/operações de crédito encontrados.

Para CADA contrato/operação, retorne um objeto JSON com os campos abaixo.
Se um campo não estiver presente, omita-o.

Campos:
- banco: nome da instituição financeira (ex: "SICREDI", "Banco do Brasil", "Bradesco")
- modalidade: tipo da operação (ex: "Custeio Agrícola", "Pronamp", "Investimento", "Capital de Giro", "Moderfrota", "BNDES Finame", "CPR")
- numeroContrato: número/código do contrato
- dataContratacao: data de contratação no formato YYYY-MM-DD
- vencimento: data de vencimento da última parcela no formato YYYY-MM-DD
- valorTomado: valor principal do contrato em reais (número puro, sem R$ ou pontos)
- valorParcela: valor de cada parcela em reais (número puro)
- totalParcelas: número total de parcelas (inteiro)
- taxa: taxa de juros ANUAL como decimal (9,5% a.a. → 0.095; se mensal, multiplique por 12 aproximadamente)
- periodicidade: "Mensal", "Semestral", "Anual", "Trimestral" ou "Único"
- obs: observações relevantes (ex: indexador CDI, garantias, etc.)

Responda APENAS com JSON válido, sem texto antes ou depois.

Se houver UM contrato:
{"banco":"...","modalidade":"...",...}

Se houver MÚLTIPLOS contratos:
{"contratos":[{"banco":"..."},{"banco":"..."}]}`

export async function parsePdfContract(buffer: Buffer): Promise<ContractFields> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY não configurada no servidor.')
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const base64 = buffer.toString('base64')

  let message
  try {
    message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    })
  } catch (apiErr: any) {
    console.error('[PDF] Anthropic API error:', apiErr?.message ?? apiErr)
    throw new Error(`Erro na API Anthropic: ${apiErr?.message ?? 'desconhecido'}`)
  }

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  console.log('[PDF] Claude raw response:', raw.slice(0, 500))

  // Remove markdown code fences se presentes
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

  try {
    return JSON.parse(jsonStr) as ContractFields
  } catch {
    console.error('[PDF] JSON parse failed. Raw:', raw.slice(0, 300))
    throw new Error(`Não foi possível interpretar o PDF. Resposta do Claude: ${raw.slice(0, 200)}`)
  }
}
