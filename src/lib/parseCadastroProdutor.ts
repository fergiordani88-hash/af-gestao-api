import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse'

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

export async function parseCadastroProdutor(buffer: Buffer): Promise<CadastroParseResult> {
  const parsed = await pdfParse(buffer)
  const text = parsed.text.slice(0, 20000) // limita tokens para evitar timeout

  const prompt = `Você é um extrator de dados de cadastros bancários de produtores rurais brasileiros.
Analise o texto abaixo e extraia TODOS os dados estruturados em JSON conforme o schema.

REGRAS IMPORTANTES:
- Para máquinas (tratores, colheitadeiras, plantadeiras, distribuidores, pulverizadores, escarificadores, transbordos, geradores, plataformas): categoria = "Máquinas"
- Para equipamentos leves e implementos: categoria = "Equipamentos"
- Para veículos (caminhões, automóveis, semi-reboques, reboques): categoria = "Veículos"
- Para imóveis rurais (fazendas, sítios, chácaras, propriedades) e benfeitorias (aviários, barracões, casas, poços, currais, cercas): categoria = "Imóveis rurais"
- possuiOnus = true se Status = "Alienado" ou houver "Valor Alienação" > 0
- valorOnus = valor do campo "Valor Alienação" quando alienado
- Para imóveis alienados, credor = "Sicredi / FINAME" (banco credor genérico)
- identificacao: para máquinas use "Série: XXX | Ano: YYYY"; para imóveis use "Matrícula: NNN"
- obs: para imóveis inclua área em hectares e cidade
- Para produção (Renda Efetiva e Renda Prevista):
  * safra: formato "AAAA/AA" ex: "2024/25"
  * cultura: "Soja" ou "Milho" ou nome exato
  * area: hectares plantados
  * produtividade: sacos/ha — converter se necessário (1 ton soja = 16,67 sc; 1 ton milho = 16,67 sc; se vier em kg/ha divida por 60)
  * cotacao: R$/saca — converter se necessário (se vier em R$/ton divida por 16,667; se vier em R$/kg multiplique por 60)
  * custoPorHa: custo em R$/ha
  * areaArrendada: 0 se não informado
  * custoArrendHa: 0 se não informado
- Use apenas dados explicitamente presentes no texto. Não invente valores.

Retorne APENAS o JSON, sem explicações adicionais.

Schema esperado:
{
  "nomeProdutor": "string",
  "cpf": "string",
  "cidade": "string",
  "estado": "string",
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
}

TEXTO DO CADASTRO:
${text}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 6000,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  const jsonStr = raw.startsWith('{') ? raw : raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
  return JSON.parse(jsonStr) as CadastroParseResult
}
