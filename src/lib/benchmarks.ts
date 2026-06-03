// Benchmarks financeiros por setor — dados reais de fontes brasileiras
// Fontes: IMEA, CONAB, Sebrae, IEDI Cartas 1223/1280, PwC Brasil 2024, CNA
// Atualização: Junho/2026 | Safra referência: 2024/25

export interface Benchmark {
  label: string
  unit: string
  min: number       // mínimo aceitável
  ideal_min: number // faixa ideal inferior
  ideal_max: number // faixa ideal superior
  fonte: string
  ano: string
  descricao: string
}

export type BenchmarkMap = Record<string, Benchmark>

// ── PJ: Comércio Varejista ────────────────────────────────────
export const benchmarkComercio: BenchmarkMap = {
  margBruta:  { label: 'Margem Bruta',          unit: '%',   min: 0.15, ideal_min: 0.25, ideal_max: 0.35, fonte: 'Sebrae / IEDI Carta 1280', ano: '2024', descricao: 'Percentual da receita que sobra após descontar o custo da mercadoria.' },
  margEbitda: { label: 'Margem EBITDA',          unit: '%',   min: 0.05, ideal_min: 0.10, ideal_max: 0.14, fonte: 'PwC Brasil / IEDI 2024 (varejo 11,7–12,0%)', ano: '2024', descricao: 'Quanto da receita sobra da operação antes de juros, impostos e amortizações.' },
  margLiq:    { label: 'Margem Líquida',         unit: '%',   min: 0.02, ideal_min: 0.03, ideal_max: 0.05, fonte: 'IEDI Carta 1280 / Sebrae', ano: '2024', descricao: 'Percentual da receita que se transforma em lucro após todos os custos.' },
  liquidezC:  { label: 'Liquidez Corrente',      unit: 'x',   min: 1.2,  ideal_min: 1.5,  ideal_max: 2.2,  fonte: 'PwC Brasil (comércio 1,6x→2,2x 2023-2024)', ano: '2024', descricao: 'Capacidade de cobrir obrigações de curto prazo com ativos circulantes.' },
  liquidezS:  { label: 'Liquidez Seca',          unit: 'x',   min: 0.8,  ideal_min: 1.0,  ideal_max: 1.4,  fonte: 'Sebrae / referência setorial Brasil', ano: '2024', descricao: 'Liquidez sem depender da venda do estoque.' },
  cobDivida:  { label: 'Cobertura da Dívida',    unit: 'x',   min: 1.0,  ideal_min: 1.5,  ideal_max: 6.0,  fonte: 'IEDI Carta 1280', ano: '2024', descricao: 'Quantas vezes o EBITDA cobre a parcela bancária total.' },
  solvencia:  { label: 'Solvência Geral',        unit: 'x',   min: 1.0,  ideal_min: 1.5,  ideal_max: 4.0,  fonte: 'Sebrae / literatura financeira PME Brasil', ano: '2024', descricao: 'Cobertura simplificada dos passivos totais pelos ativos informados.' },
  cmvRec:     { label: 'CMV / Receita',          unit: '%',   min: 0,    ideal_min: 0.60, ideal_max: 0.70, fonte: 'Sebrae — varejo geral PME', ano: '2024', descricao: 'Participação do custo da mercadoria na receita. Complemento da margem bruta.' },
  custoFixo:  { label: 'Custo Fixo / Receita',   unit: '%',   min: 0,    ideal_min: 0.12, ideal_max: 0.20, fonte: 'Sebrae / referência PME varejo Brasil', ano: '2024', descricao: 'Percentual da receita comprometido com despesas que não variam com o volume.' },
  endivRec:   { label: 'Endividamento / Receita', unit: '%',  min: 0,    ideal_min: 0.15, ideal_max: 0.30, fonte: 'IEDI Carta 1280 / PwC 2024', ano: '2024', descricao: 'Proporção da dívida em relação à receita anual.' },
  giroEst:    { label: 'Giro de Estoque',        unit: 'dias', min: 15,  ideal_min: 30,   ideal_max: 60,   fonte: 'Sebrae — varejo geral 2023', ano: '2024', descricao: 'Tempo médio que os produtos ficam no estoque antes de serem vendidos.' },
  capitalTerc:{ label: 'Capital de Terceiros',   unit: '%',   min: 0,    ideal_min: 0.30, ideal_max: 0.50, fonte: 'IEDI Carta 1280 (dívida recuou 45,5% em 2024)', ano: '2024', descricao: 'Quanto da estrutura financeira depende de dívidas.' },
}

// ── PJ: Serviços ──────────────────────────────────────────────
export const benchmarkServicos: BenchmarkMap = {
  margBruta:  { label: 'Margem Bruta',          unit: '%',   min: 0.30, ideal_min: 0.45, ideal_max: 0.65, fonte: 'IEDI / literatura setorial Brasil 2023', ano: '2024', descricao: 'Percentual da receita que sobra após descontar custos diretos dos serviços.' },
  margEbitda: { label: 'Margem EBITDA',          unit: '%',   min: 0.10, ideal_min: 0.15, ideal_max: 0.25, fonte: 'IEDI Carta 1280 (serviços excl. energia: 21,1% em 2023)', ano: '2024', descricao: 'Resultado operacional antes de efeitos financeiros e contábeis.' },
  margLiq:    { label: 'Margem Líquida',         unit: '%',   min: 0.05, ideal_min: 0.08, ideal_max: 0.12, fonte: 'IEDI Carta 1280 (serviços: 6,0–6,3%)', ano: '2024', descricao: 'Quanto da receita se transforma em lucro após todos os custos.' },
  liquidezC:  { label: 'Liquidez Corrente',      unit: 'x',   min: 1.1,  ideal_min: 1.3,  ideal_max: 2.0,  fonte: 'Referência setorial Brasil — serviços 2023-2024', ano: '2024', descricao: 'Capacidade de cobrir obrigações de curto prazo.' },
  liquidezS:  { label: 'Liquidez Seca',          unit: 'x',   min: 0.9,  ideal_min: 1.0,  ideal_max: 1.6,  fonte: 'Literatura financeira PME Brasil 2023', ano: '2024', descricao: 'Liquidez sem depender do estoque.' },
  cobDivida:  { label: 'Cobertura da Dívida',    unit: 'x',   min: 1.0,  ideal_min: 1.5,  ideal_max: 6.0,  fonte: 'IEDI Carta 1280 (serviços: EBITDA/desp.fin. ~1,1x em 2023)', ano: '2024', descricao: 'Capacidade do EBITDA cobrir a parcela bancária.' },
  solvencia:  { label: 'Solvência Geral',        unit: 'x',   min: 1.0,  ideal_min: 1.5,  ideal_max: 4.0,  fonte: 'Referência geral PME Brasil', ano: '2024', descricao: 'Cobertura dos passivos pelos ativos.' },
  cmvRec:     { label: 'CPV / Receita',          unit: '%',   min: 0,    ideal_min: 0.30, ideal_max: 0.50, fonte: 'Derivado da margem bruta 45–65%', ano: '2024', descricao: 'Custo dos serviços prestados em relação à receita.' },
  custoFixo:  { label: 'Custo Fixo / Receita',   unit: '%',   min: 0,    ideal_min: 0.15, ideal_max: 0.25, fonte: 'Referência PME serviços Brasil 2023-2024', ano: '2024', descricao: 'Peso das despesas fixas sobre a receita.' },
  endivRec:   { label: 'Endividamento / Receita', unit: '%',  min: 0,    ideal_min: 0.10, ideal_max: 0.25, fonte: 'IEDI Carta 1280 — serviços menor alavancagem', ano: '2024', descricao: 'Relação entre dívida financeira e receita anual.' },
  capitalTerc:{ label: 'Capital de Terceiros',   unit: '%',   min: 0,    ideal_min: 0.25, ideal_max: 0.45, fonte: 'IEDI / referência geral 2023', ano: '2024', descricao: 'Participação de dívidas na estrutura de capital.' },
}

// ── PJ: Indústria PME ─────────────────────────────────────────
export const benchmarkIndustria: BenchmarkMap = {
  margBruta:  { label: 'Margem Bruta',          unit: '%',   min: 0.15, ideal_min: 0.20, ideal_max: 0.30, fonte: 'IEDI Carta 1223 (24,8%→20,9%→18,7%)', ano: '2024', descricao: 'Margem após descontar matéria-prima e insumos diretos.' },
  margEbitda: { label: 'Margem EBITDA',          unit: '%',   min: 0.06, ideal_min: 0.10, ideal_max: 0.18, fonte: 'IEDI Carta 1280 (indústria excl. gigantes: 10,4%→8,4%)', ano: '2024', descricao: 'Resultado operacional industrial.' },
  margLiq:    { label: 'Margem Líquida',         unit: '%',   min: 0.03, ideal_min: 0.05, ideal_max: 0.08, fonte: 'IEDI Carta 1280 (5,7%→4,3%)', ano: '2024', descricao: 'Lucro líquido sobre receita.' },
  liquidezC:  { label: 'Liquidez Corrente',      unit: 'x',   min: 1.2,  ideal_min: 1.5,  ideal_max: 2.2,  fonte: 'Referência setorial indústria PME Brasil 2023-2024', ano: '2024', descricao: 'Cobertura dos passivos circulantes.' },
  liquidezS:  { label: 'Liquidez Seca',          unit: 'x',   min: 0.8,  ideal_min: 1.0,  ideal_max: 1.5,  fonte: 'Literatura financeira PME Brasil 2023', ano: '2024', descricao: 'Liquidez excluindo estoques.' },
  cobDivida:  { label: 'Cobertura da Dívida',    unit: 'x',   min: 1.0,  ideal_min: 1.5,  ideal_max: 6.0,  fonte: 'IEDI Carta 1280 (1,6x→1,1x 2022-2023)', ano: '2024', descricao: 'EBITDA sobre parcela bancária.' },
  solvencia:  { label: 'Solvência Geral',        unit: 'x',   min: 1.0,  ideal_min: 1.5,  ideal_max: 3.5,  fonte: 'IEDI / referência industrial PME', ano: '2024', descricao: 'Cobertura dos passivos pelos ativos.' },
  cmvRec:     { label: 'CMV / Receita',          unit: '%',   min: 0,    ideal_min: 0.65, ideal_max: 0.75, fonte: 'Derivado da margem bruta 20–30%', ano: '2024', descricao: 'Custo de produção sobre receita.' },
  custoFixo:  { label: 'Custo Fixo / Receita',   unit: '%',   min: 0,    ideal_min: 0.15, ideal_max: 0.22, fonte: 'Referência PME industrial Brasil 2023-2024', ano: '2024', descricao: 'Peso estrutural dos custos fixos.' },
  endivRec:   { label: 'Endividamento / Receita', unit: '%',  min: 0,    ideal_min: 0.20, ideal_max: 0.35, fonte: 'IEDI Carta 1223 (dívida/PL: 84,5%→71,7%)', ano: '2024', descricao: 'Dívida financeira sobre receita anual.' },
  capitalTerc:{ label: 'Capital de Terceiros',   unit: '%',   min: 0,    ideal_min: 0.35, ideal_max: 0.55, fonte: 'IEDI 1223 (dívida/PL 60–85% em 2019-2022)', ano: '2024', descricao: 'Alavancagem financeira da empresa.' },
}

// ── Agro: Soja Mato Grosso ────────────────────────────────────
export const benchmarkSojaMT: BenchmarkMap = {
  produtividade:     { label: 'Produtividade',              unit: 'sc/ha', min: 45,    ideal_min: 57,    ideal_max: 62,    fonte: 'IMEA Safra 2024/25 (57,97–62,07 sc/ha)', ano: '2025', descricao: 'Sacas de soja produzidas por hectare. Média Mato Grosso.' },
  custoPorHa:        { label: 'Custo Operacional Total/ha', unit: 'R$',   min: 0,     ideal_min: 5500,  ideal_max: 6500,  fonte: 'IMEA 2024/25 (COT = R$ 6.101,74/ha)', ano: '2025', descricao: 'Custo operacional total por hectare cultivado (IMEA COT).' },
  custoPorSaca:      { label: 'Custo por Saca (COE)',       unit: 'R$',   min: 0,     ideal_min: 85,    ideal_max: 105,   fonte: 'IMEA 2024/25 (COE ÷ produt. = R$ 95,08/sc)', ano: '2025', descricao: 'Custo mínimo operacional por saca produzida. Viabilidade operacional.' },
  margem:            { label: 'Margem sobre COT',           unit: '%',    min: 0,     ideal_min: 6,     ideal_max: 15,    fonte: 'IMEA 2024/25 (margem s/ COT ≈ 6,6%)', ano: '2025', descricao: 'Resultado sobre o custo operacional total.' },
  pe:                { label: 'Ponto de Equilíbrio',        unit: 'sc/ha',min: 0,     ideal_min: 52,    ideal_max: 54,    fonte: 'IMEA 2024/25 (PE sobre COE = 52,24–52,96 sc/ha)', ano: '2025', descricao: 'Produtividade mínima para cobrir o custo operacional efetivo.' },
  rentabilidadeHa:   { label: 'Rentabilidade/ha',           unit: 'R$',   min: 0,     ideal_min: 400,   ideal_max: 1961,  fonte: 'IMEA (margem s/ COT 2024/25 = R$ 406/ha; EBITDA = R$ 1.961/ha)', ano: '2025', descricao: 'Resultado financeiro por hectare cultivado.' },
  comprometimento:   { label: 'Comprometimento da Receita', unit: '%',    min: 0,     ideal_min: 10,    ideal_max: 20,    fonte: 'Referência prudencial agro (inadimplência rural 7,6% em 2024)', ano: '2025', descricao: 'Parcela do endividamento que compromete a receita da safra.' },
  endivPatrimonio:   { label: 'Endividamento/Patrimônio',   unit: '%',    min: 0,     ideal_min: 20,    ideal_max: 40,    fonte: 'CNA/FGV Agro 2024 (recuperação judicial agro +138% em 2024)', ano: '2025', descricao: 'Relação entre dívida total e patrimônio rural.' },
}

// ── Agro: Milho 2ª Safra Mato Grosso ─────────────────────────
export const benchmarkMilhoMT: BenchmarkMap = {
  produtividade:     { label: 'Produtividade',              unit: 'sc/ha', min: 80,    ideal_min: 110,   ideal_max: 127,   fonte: 'IMEA/Abramilho 2024/25 (média 3a = 110,85; proj. = 126,25 sc/ha)', ano: '2025', descricao: 'Sacas de milho produzidas por hectare na 2ª safra Mato Grosso.' },
  custoPorHa:        { label: 'Custo Operacional/ha',       unit: 'R$',   min: 0,     ideal_min: 4000,  ideal_max: 5000,  fonte: 'IMEA 2024/25 (COE = R$ 4.589,36/ha)', ano: '2025', descricao: 'Custo operacional efetivo por hectare de milho safrinha.' },
  custoPorSaca:      { label: 'Custo por Saca (COE)',       unit: 'R$',   min: 0,     ideal_min: 38,    ideal_max: 42,    fonte: 'IMEA/CNA 2025/26 (PE COE = R$ 41,22/sc)', ano: '2025', descricao: 'Custo mínimo operacional por saca de milho produzida.' },
  margem:            { label: 'Margem Bruta',               unit: '%',    min: 0,     ideal_min: 15,    ideal_max: 30,    fonte: 'IMEA 2024/25 (MB = R$ 2.325/ha; projeção 2025/26 = R$ 1.219/ha)', ano: '2025', descricao: 'Margem da atividade sobre o COE.' },
  pe:                { label: 'Ponto de Equilíbrio (COE)',  unit: 'sc/ha',min: 0,     ideal_min: 79,    ideal_max: 90,    fonte: 'IMEA 2024/25 (PE COE a R$ 40,74 = 79,45 sc/ha)', ano: '2025', descricao: 'Produtividade mínima para cobrir o COE.' },
  rentabilidadeHa:   { label: 'Rentabilidade/ha',           unit: 'R$',   min: 0,     ideal_min: 500,   ideal_max: 2325,  fonte: 'IMEA 2024/25 (MB = R$ 2.325/ha; proj. 2025/26 = R$ 1.219/ha)', ano: '2025', descricao: 'Margem bruta por hectare de milho safrinha.' },
  comprometimento:   { label: 'Comprometimento da Receita', unit: '%',    min: 0,     ideal_min: 10,    ideal_max: 20,    fonte: 'Referência prudencial agro MT', ano: '2025', descricao: 'Percentual da receita comprometido com dívidas bancárias.' },
  endivPatrimonio:   { label: 'Endividamento/Patrimônio',   unit: '%',    min: 0,     ideal_min: 20,    ideal_max: 40,    fonte: 'CNA/FGV Agro 2024', ano: '2025', descricao: 'Relação entre dívida total e patrimônio rural.' },
}

export const BENCHMARKS_PJ: Record<string, BenchmarkMap> = {
  COMERCIO: benchmarkComercio,
  SERVICOS: benchmarkServicos,
  INDUSTRIA: benchmarkIndustria,
}

// ── Agro: Algodão Mato Grosso ─────────────────────────────────
export const benchmarkAlgodaoMT: BenchmarkMap = {
  produtividade:   { label: 'Produtividade',              unit: '@/ha',  min: 90,    ideal_min: 115,   ideal_max: 130,   fonte: 'IMEA Safra 2024/25 (118,11 @/ha)', ano: '2025', descricao: 'Arrobas de pluma por hectare. Média Mato Grosso 2024/25.' },
  custoPorHa:      { label: 'Custo Operacional Total/ha', unit: 'R$',   min: 0,     ideal_min: 13000, ideal_max: 15200, fonte: 'IMEA 2024/25 (COE = R$ 13.091/ha; CT 25/26 = R$ 15.179/ha)', ano: '2025', descricao: 'Custo operacional efetivo por hectare (IMEA).' },
  custoPorArroba:  { label: 'Custo por Arroba (COE)',     unit: 'R$',   min: 0,     ideal_min: 100,   ideal_max: 115,   fonte: 'IMEA 2024/25 (PE COE = R$ 110,07/@)', ano: '2025', descricao: 'Custo mínimo por arroba para cobrir o COE.' },
  margem:          { label: 'Margem sobre COE',           unit: '%',    min: 0,     ideal_min: 15,    ideal_max: 30,    fonte: 'IMEA 2024/25 (margem ~26% com preço R$ 138,72/@)', ano: '2025', descricao: 'Margem percentual sobre o custo operacional efetivo.' },
  pe:              { label: 'Ponto de Equilíbrio',        unit: '@/ha', min: 0,     ideal_min: 80,    ideal_max: 100,   fonte: 'IMEA 2024/25 (PE COE ~94 @/ha a R$ 138,72/@)', ano: '2025', descricao: 'Produtividade mínima para cobrir o COE.' },
  rentabilidadeHa: { label: 'Rentabilidade/ha',           unit: 'R$',   min: 0,     ideal_min: 3000,  ideal_max: 8000,  fonte: 'IMEA 2024/25 (PE COT = R$ 131,31/@; preço R$ 138,72/@)', ano: '2025', descricao: 'Resultado financeiro por hectare cultivado.' },
  comprometimento: { label: 'Comprometimento da Receita', unit: '%',    min: 0,     ideal_min: 15,    ideal_max: 30,    fonte: 'Referência prudencial agro MT 2024', ano: '2025', descricao: 'Parcela do endividamento que compromete a receita da safra.' },
  endivPatrimonio: { label: 'Endividamento/Patrimônio',   unit: '%',    min: 0,     ideal_min: 20,    ideal_max: 45,    fonte: 'CNA/FGV Agro 2024', ano: '2025', descricao: 'Relação entre dívida total e patrimônio rural.' },
}

// ── Agro: Sorgo Mato Grosso (safrinha) ───────────────────────
export const benchmarkSorgoMT: BenchmarkMap = {
  produtividade:   { label: 'Produtividade',              unit: 'sc/ha', min: 40,    ideal_min: 60,    ideal_max: 80,    fonte: 'CONAB/CONFAEAB 2024/25 (60–80 sc/ha safrinha MT)', ano: '2025', descricao: 'Sacas de sorgo por hectare na safrinha Mato Grosso.' },
  custoPorHa:      { label: 'Custo de Produção/ha',       unit: 'R$',   min: 0,     ideal_min: 2200,  ideal_max: 2600,  fonte: 'CONFAEAB 2024 (custo ~25% menor que milho safrinha)', ano: '2025', descricao: 'Custo total por hectare de sorgo safrinha.' },
  custoPorSaca:    { label: 'Custo por Saca',             unit: 'R$',   min: 0,     ideal_min: 32,    ideal_max: 40,    fonte: 'Derivado: R$ 2.400/ha ÷ 70 sc/ha', ano: '2025', descricao: 'Custo por saca de sorgo produzida.' },
  margem:          { label: 'Margem Bruta',               unit: '%',    min: 0,     ideal_min: 20,    ideal_max: 40,    fonte: 'CONFAEAB (preço ~R$ 65/sc; custo ~R$ 38/sc → margem ~40%)', ano: '2025', descricao: 'Margem do sorgo safrinha sobre o custo de produção.' },
  pe:              { label: 'Ponto de Equilíbrio',        unit: 'sc/ha',min: 0,     ideal_min: 35,    ideal_max: 45,    fonte: 'Estimativa: R$ 2.400/ha ÷ R$ 65/sc = 37 sc/ha', ano: '2025', descricao: 'Produtividade mínima para cobrir os custos.' },
  rentabilidadeHa: { label: 'Rentabilidade/ha',           unit: 'R$',   min: 0,     ideal_min: 1950,  ideal_max: 2350,  fonte: 'CONFAEAB 2024 (receita ~R$ 4.550/ha − custo ~R$ 2.400/ha)', ano: '2025', descricao: 'Margem bruta por hectare de sorgo safrinha.' },
  comprometimento: { label: 'Comprometimento da Receita', unit: '%',    min: 0,     ideal_min: 10,    ideal_max: 20,    fonte: 'Referência prudencial agro MT', ano: '2025', descricao: 'Percentual da receita comprometido com dívidas.' },
  endivPatrimonio: { label: 'Endividamento/Patrimônio',   unit: '%',    min: 0,     ideal_min: 20,    ideal_max: 40,    fonte: 'CNA/FGV Agro 2024', ano: '2025', descricao: 'Relação entre dívida e patrimônio rural.' },
}

// ── Agro: Milheto Mato Grosso ─────────────────────────────────
export const benchmarkMilhetoMT: BenchmarkMap = {
  produtividade:   { label: 'Produtividade (grão)',       unit: 'sc/ha', min: 30,    ideal_min: 40,    ideal_max: 51,    fonte: 'MaisSoja/CONAB 2024 (40–51 sc/ha com híbridos)', ano: '2025', descricao: 'Sacas de milheto grão por hectare (uso comercial).' },
  custoPorHa:      { label: 'Custo de Produção/ha',       unit: 'R$',   min: 0,     ideal_min: 1200,  ideal_max: 1800,  fonte: 'Referência setorial MT 2024 (cultura de baixo custo)', ano: '2025', descricao: 'Custo total por hectare de milheto (palhada/cobertura: R$ 300–600/ha).' },
  custoPorSaca:    { label: 'Custo por Saca',             unit: 'R$',   min: 0,     ideal_min: 28,    ideal_max: 38,    fonte: 'Estimativa: R$ 1.500/ha ÷ 45 sc/ha', ano: '2025', descricao: 'Custo por saca de milheto produzida.' },
  margem:          { label: 'Margem Bruta',               unit: '%',    min: 0,     ideal_min: 15,    ideal_max: 35,    fonte: 'Estimativa (preço ~R$ 40/sc; custo ~R$ 33/sc → ~17%)', ano: '2025', descricao: 'Margem sobre custo de produção do milheto grão.' },
  pe:              { label: 'Ponto de Equilíbrio',        unit: 'sc/ha',min: 0,     ideal_min: 32,    ideal_max: 42,    fonte: 'Estimativa: R$ 1.500/ha ÷ R$ 40/sc = 37,5 sc/ha', ano: '2025', descricao: 'Produtividade mínima para cobrir os custos.' },
  rentabilidadeHa: { label: 'Rentabilidade/ha',           unit: 'R$',   min: 0,     ideal_min: 300,   ideal_max: 800,   fonte: 'Estimativa MT + ganho indireto soja (+3,48 sc/ha)', ano: '2025', descricao: 'Margem direta + benefício indireto na soja seguinte.' },
  comprometimento: { label: 'Comprometimento da Receita', unit: '%',    min: 0,     ideal_min: 5,     ideal_max: 15,    fonte: 'Referência prudencial agro MT', ano: '2025', descricao: 'Uso predominante como palhada — menor comprometimento.' },
  endivPatrimonio: { label: 'Endividamento/Patrimônio',   unit: '%',    min: 0,     ideal_min: 15,    ideal_max: 35,    fonte: 'CNA/FGV Agro 2024', ano: '2025', descricao: 'Relação entre dívida e patrimônio.' },
}

// ── Agro: Girassol Mato Grosso (safrinha) ────────────────────
export const benchmarkGirassolMT: BenchmarkMap = {
  produtividade:   { label: 'Produtividade',              unit: 'sc/ha', min: 20,    ideal_min: 31,    ideal_max: 40,    fonte: 'SISTEMA FAEG/CONAB 2024/25 (31–32 sc/ha MT)', ano: '2025', descricao: 'Sacas de girassol por hectare na safrinha MT.' },
  custoPorHa:      { label: 'Custo de Produção/ha',       unit: 'R$',   min: 0,     ideal_min: 1750,  ideal_max: 2200,  fonte: 'O Estado Online 2024 (custo 38,55% menor que soja)', ano: '2025', descricao: 'Custo total por hectare de girassol safrinha.' },
  custoPorSaca:    { label: 'Custo por Saca',             unit: 'R$',   min: 0,     ideal_min: 55,    ideal_max: 70,    fonte: 'Estimativa: R$ 2.000/ha ÷ 32 sc/ha = R$ 62,50/sc', ano: '2025', descricao: 'Custo por saca de girassol produzida.' },
  margem:          { label: 'Margem Bruta',               unit: '%',    min: 0,     ideal_min: 20,    ideal_max: 40,    fonte: 'SISTEMA FAEG (preço R$ 100–130/sc; PE ~16 sc/ha)', ano: '2025', descricao: 'Margem do girassol sobre o custo de produção.' },
  pe:              { label: 'Ponto de Equilíbrio',        unit: 'sc/ha',min: 0,     ideal_min: 14,    ideal_max: 18,    fonte: 'SISTEMA FAEG 2024 (PE ~16 sc/ha a R$ 110/sc)', ano: '2025', descricao: 'Produtividade mínima para cobrir os custos a R$ 110/sc.' },
  rentabilidadeHa: { label: 'Rentabilidade/ha',           unit: 'R$',   min: 0,     ideal_min: 1210,  ideal_max: 1650,  fonte: 'O Estado Online (receita ~R$ 3.410/ha − custo ~R$ 2.000/ha)', ano: '2025', descricao: 'Margem bruta por hectare de girassol safrinha.' },
  comprometimento: { label: 'Comprometimento da Receita', unit: '%',    min: 0,     ideal_min: 10,    ideal_max: 20,    fonte: 'Referência prudencial agro MT', ano: '2025', descricao: 'Percentual da receita comprometido com dívidas.' },
  endivPatrimonio: { label: 'Endividamento/Patrimônio',   unit: '%',    min: 0,     ideal_min: 20,    ideal_max: 40,    fonte: 'CNA/FGV Agro 2024', ano: '2025', descricao: 'Relação entre dívida e patrimônio.' },
}

export const BENCHMARKS_AGRO: Record<string, BenchmarkMap> = {
  SOJA:     benchmarkSojaMT,
  MILHO:    benchmarkMilhoMT,
  ALGODAO:  benchmarkAlgodaoMT,
  SORGO:    benchmarkSorgoMT,
  MILHETO:  benchmarkMilhetoMT,
  GIRASSOL: benchmarkGirassolMT,
}

export function getBenchmarkPJ(segment: string): BenchmarkMap {
  const key = segment?.toUpperCase()
  return BENCHMARKS_PJ[key] ?? benchmarkComercio
}
