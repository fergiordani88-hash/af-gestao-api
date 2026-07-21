import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export interface PatrimonioImport {
  categoria: 'Máquinas' | 'Equipamentos' | 'Veículos' | 'Imóveis rurais' | 'Imóveis urbanos' | 'Outros'
  descricao: string
  identificacao?: string
  valorAvaliado: number
  possuiOnus: boolean
  tipoOnus?: string
  credor?: string
  valorOnus?: number
  obs?: string
}

export interface ProducaoImport {
  safra: string
  cultura: string
  area: number
  produtividade: number
  cotacao: number
  custoPorHa: number
  areaArrendada: number
  custoArrendHa: number
}

export interface CadastroParseResult {
  nomeProdutor?: string
  cpf?: string
  cidade?: string
  estado?: string
  telefone?: string
  patrimonio: PatrimonioImport[]
  producao: ProducaoImport[]
}

const PROMPT = `Você é um extrator de dados de cadastros bancários de produtores rurais brasileiros.
Analise o PDF e extraia TODOS os dados em JSON conforme o schema abaixo.

REGRAS:
- Máquinas: tratores, colheitadeiras, plantadeiras, distribuidores, pulverizadores, escarificadores, transbordos, geradores, plataformas → categoria "Máquinas"
- Equipamentos: implementos agrícolas leves → categoria "Equipamentos"
- Veículos: caminhões, automóveis, pickups, semi-reboques, reboques → categoria "Veículos"
- Imóveis rurais: fazendas, sítios, chácaras e suas benfeitorias (aviários, barracões, casas, poços, currais, cercas) → categoria "Imóveis rurais"
- possuiOnus = true se Status = "Alienado" ou Valor Alienação > 0
- valorOnus = valor do campo "Valor Alienação"
- identificacao: máquinas → "Série: XXX | Ano: YYYY"; imóveis → "Matrícula: NNN"
- obs: imóveis → incluir área ha e cidade
- Produção (seções "Renda Efetiva" e "Renda Prevista"):
  * safra: "AAAA/AA" ex: "2024/25"
  * produtividade em sc/ha (converter: 1 ton = 16,667 sc; kg/ha ÷ 60 = sc/ha)
  * cotacao em R$/sc (converter: R$/ton ÷ 16,667; R$/kg × 60)
  * custoPorHa: custo em R$/ha
  * areaArrendada e custoArrendHa: 0 se não informado
- Não invente valores. Use apenas o que está no documento.

Retorne APENAS o JSON, sem texto adicional:
{
  "nomeProdutor": "string",
  "cpf": "string",
  "cidade": "string",
  "estado": "string (sigla)",
  "telefone": "string",
  "patrimonio": [
    {
      "categoria": "Máquinas|Equipamentos|Veículos|Imóveis rurais|Imóveis urbanos|Outros",
      "descricao": "string",
      "identificacao": "string",
      "valorAvaliado": number,
      "possuiOnus": boolean,
      "tipoOnus": "string",
      "credor": "string",
      "valorOnus": number,
      "obs": "string"
    }
  ],
  "producao": [
    {
      "safra": "string",
      "cultura": "string",
      "area": number,
      "produtividade": number,
      "cotacao": number,
      "custoPorHa": number,
      "areaArrendada": number,
      "custoArrendHa": number
    }
  ]
}`

export async function parseCadastroProdutor(buffer: Buffer): Promise<CadastroParseResult> {
  const base64 = buffer.toString('base64')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 6000,
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
  return JSON.parse(jsonStr) as CadastroParseResult
}
