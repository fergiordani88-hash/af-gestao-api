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

export interface ContratoImport {
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
  sistemaAmortizacao?: string
  tomador?: string
}

export interface CadastroParseResult {
  nomeProdutor?: string
  cpf?: string
  cidade?: string
  estado?: string
  telefone?: string
  patrimonio: PatrimonioImport[]
  producao: ProducaoImport[]
  contratos: ContratoImport[]
}

const PROMPT = `Você é um extrator de dados de cadastros bancários de produtores rurais brasileiros.
Analise o PDF e extraia TODOS os dados em JSON conforme o schema abaixo.

REGRAS PATRIMÔNIO:
- Máquinas: tratores, colheitadeiras, plantadeiras, distribuidores, pulverizadores, escarificadores, transbordos, geradores, plataformas → categoria "Máquinas"
- Equipamentos: implementos agrícolas leves → categoria "Equipamentos"
- Veículos: caminhões, automóveis, pickups, semi-reboques, reboques → categoria "Veículos"
- Imóveis rurais: fazendas, sítios, chácaras e suas benfeitorias (aviários, barracões, casas, poços, currais, cercas) → categoria "Imóveis rurais"
- possuiOnus = true se Status = "Alienado" ou Valor Alienação > 0
- valorOnus = valor do campo "Valor Alienação"
- identificacao: máquinas → "Série: XXX | Ano: YYYY"; imóveis → "Matrícula: NNN"
- obs: imóveis → incluir área ha e cidade

REGRAS PRODUÇÃO (seções "Renda Efetiva" e "Renda Prevista"):
  * safra: "AAAA/AA" ex: "2024/25"
  * CONVERSÃO DE PRODUTIVIDADE (campo "Quantidade" da coluna Produção):
    - Se o valor de Quantidade > 100 (ex: 9.000), está em KG/HA → dividir por 60 para obter sc/ha. Exemplo: 9.000 kg/ha ÷ 60 = 150 sc/ha
    - Se o valor de Quantidade < 20 (ex: 4,50), está em TON/HA → multiplicar por 16,667 para obter sc/ha. Exemplo: 4,5 t/ha × 16,667 = 75 sc/ha
  * CONVERSÃO DE COTAÇÃO (campo "Unitário" da coluna Receita):
    - Se Unitário < 5 (ex: 1,00), está em R$/KG → multiplicar por 60 para obter R$/sc. Exemplo: R$1,00/kg × 60 = R$60/sc
    - Se Unitário entre 100 e 10.000 (ex: 2.000), está em R$/TON → dividir por 16,667 para obter R$/sc. Exemplo: R$2.000/ton ÷ 16,667 = R$120/sc
  * custoPorHa: campo "VlrP/HA" ou "Custo(ha)" — valor já em R$/ha, usar direto
  * areaArrendada e custoArrendHa: 0 se não informado
  * Incluir tanto Renda Efetiva quanto Renda Prevista (todas as safras listadas)

REGRAS CONTRATOS (seções de operações de crédito, empréstimos, financiamentos):
  * Extrair TODOS os contratos/operações de crédito encontrados no documento
  * banco: nome do banco credor (ex: "Sicredi", "Banco do Brasil", "Bradesco")
  * modalidade: nome do produto/linha de crédito (ex: "MODERFROTA", "FCO RURAL", "CUSTEIO AGRÍCOLA", "CPR POUPANÇA PÓS")
  * numeroContrato: número/código do contrato/título (ex: "C00230421-6")
  * dataContratacao: data de contratação no formato YYYY-MM-DD
  * valorTomado: valor financiado/contratado original (não o saldo atual)
  * totalParcelas: número total de parcelas do contrato
  * parcelaAtual: número da PRÓXIMA parcela a vencer = (número de parcelas com status "Liquidado" ou "Pago") + 1. Se não houver histórico de pagamento, use 1.
  * periodicidade: "Mensal", "Semestral", "Trimestral" ou "Anual" — derivar do intervalo entre vencimentos das parcelas
  * taxa: taxa de juros em decimal anual. Ex: 8,5% a.a. → 0.085; 2,81% a.m. → converter para a.a.: (1+0.0281)^12-1
  * vencimento: data de vencimento da ÚLTIMA parcela no formato YYYY-MM-DD
  * valorParcela: saldo devedor atual (valor em aberto no momento do documento)
  * sistemaAmortizacao: "SAC" ou "Price" — se não informado, use "SAC" para crédito rural
  * tomador: nome do tomador se diferente do produtor principal

- Não invente valores. Use apenas o que está no documento.
- Se o documento não tiver patrimônio, produção ou contratos, retorne arrays vazios para esses campos.

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
  ],
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
      "tomador": "string"
    }
  ]
}`

export async function parseCadastroProdutor(buffer: Buffer): Promise<CadastroParseResult> {
  const base64 = buffer.toString('base64')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 16000,
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
  const parsed = JSON.parse(jsonStr) as CadastroParseResult
  if (!parsed.contratos) parsed.contratos = []
  return parsed
}
