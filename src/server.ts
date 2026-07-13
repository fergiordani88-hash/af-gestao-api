import 'dotenv/config'
import app from './app'
import { prisma } from './lib/prisma'

const PORT = Number(process.env.PORT ?? 3333)

const MIGRATION_COLS = [
  `ALTER TABLE "AgroDRERural" ADD COLUMN IF NOT EXISTS "recFeijaoVolume" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE "AgroDRERural" ADD COLUMN IF NOT EXISTS "recFeijaoPreco"  DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE "AgroDRERural" ADD COLUMN IF NOT EXISTS "custoAtivTotal"  DOUBLE PRECISION NOT NULL DEFAULT 0`,
]

async function runMigrations() {
  const results: string[] = []
  for (const sql of MIGRATION_COLS) {
    try {
      await prisma.$executeRawUnsafe(sql)
      results.push('OK: ' + sql.substring(40, 80))
    } catch (e: any) {
      results.push('SKIP: ' + e.message.substring(0, 60))
    }
  }
  console.log('✅ Schema verificado:', results.join(' | '))
  return results
}

// Endpoint de migração manual (protegido por chave)
app.get('/admin/migrate', async (req: any, res: any) => {
  if (req.query.key !== 'af-migrate-2024') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  try {
    const results = await runMigrations()
    res.json({ ok: true, results })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

async function start() {
  try {
    await prisma.$connect()
    console.log('✅ Banco de dados conectado')
    await runMigrations()

    app.listen(PORT, () => {
      console.log('')
      console.log('🚀 AF Gestao API rodando! v2')
      console.log(`   URL:      http://localhost:${PORT}`)
      console.log(`   Health:   http://localhost:${PORT}/health`)
      console.log(`   Ambiente: ${process.env.NODE_ENV ?? 'development'}`)
      console.log('')
    })
  } catch (err) {
    console.error('❌ Falha ao iniciar servidor:', err)
    process.exit(1)
  }
}

start()
