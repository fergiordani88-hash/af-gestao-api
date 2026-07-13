import { PrismaClient } from '@prisma/client'

const SUPABASE_URL = 'postgresql://postgres:Fer4734298*@db.zkotxmhvrkkiweawgofs.supabase.co:5432/postgres'
const NEON_URL = 'postgresql://neondb_owner:npg_kW3CR1lePGKZ@ep-gentle-band-ac2up397-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

const src = new PrismaClient({ datasources: { db: { url: SUPABASE_URL } } })
const dst = new PrismaClient({ datasources: { db: { url: NEON_URL } } })

const tables = [
  'User', 'Client', 'Contact', 'Attendance', 'Contract', 'Document',
  'DiagnosticoPJ', 'DiagnosticoAgro', 'CashFlow', 'CreditOperation',
  'ActionPlan', 'AgroProducao', 'AgroContrato', 'AgroDespesa', 'AgroReceita',
  'AgroCustoFixo', 'AgroPatrimonio', 'PJDre', 'PJRecebimento', 'PJPagamento',
  'PJContrato', 'PJDespesa', 'PJReceita', 'PJCustoFixo', 'PJStressTest',
  'PJHistoricoIndicadores', 'AgroHistoricoSafra', 'AgroDRERural',
  'PJInadimplencia', 'QuestionarioPJ', 'QuestionarioAgro', 'Meta', 'PJDreProjetado'
]

async function migrateTable(table) {
  const rows = await src.$queryRawUnsafe(`SELECT * FROM "${table}"`)
  if (rows.length === 0) { console.log(`  ${table}: vazio`); return 0 }

  await dst.$executeRawUnsafe(`DELETE FROM "${table}"`)

  let count = 0
  for (const row of rows) {
    const keys = Object.keys(row)
    const cols = keys.map(k => `"${k}"`).join(', ')
    const vals = keys.map((_, i) => `$${i + 1}`).join(', ')
    await dst.$executeRawUnsafe(
      `INSERT INTO "${table}" (${cols}) VALUES (${vals})`,
      ...Object.values(row)
    )
    count++
  }
  return count
}

async function main() {
  await src.$connect()
  await dst.$connect()
  console.log('✅ Conectado em Supabase e Neon\n')

  let total = 0
  for (const table of tables) {
    try {
      const n = await migrateTable(table)
      if (n > 0) { console.log(`  ✅ ${table}: ${n} registros`); total += n }
    } catch (e) {
      console.log(`  ⚠️  ${table}: ${e.message.slice(0, 100)}`)
    }
  }

  console.log(`\n✅ Migração concluída: ${total} registros copiados`)
  await src.$disconnect()
  await dst.$disconnect()
}

main().catch(console.error)
