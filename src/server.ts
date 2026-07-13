import 'dotenv/config'
import app from './app'
import { prisma } from './lib/prisma'

const PORT = Number(process.env.PORT ?? 3333)

async function runMigrations() {
  const cols = [
    `ALTER TABLE "AgroDRERural" ADD COLUMN IF NOT EXISTS "recFeijaoVolume" DOUBLE PRECISION NOT NULL DEFAULT 0`,
    `ALTER TABLE "AgroDRERural" ADD COLUMN IF NOT EXISTS "recFeijaoPreco"  DOUBLE PRECISION NOT NULL DEFAULT 0`,
    `ALTER TABLE "AgroDRERural" ADD COLUMN IF NOT EXISTS "custoAtivTotal"  DOUBLE PRECISION NOT NULL DEFAULT 0`,
  ]
  for (const sql of cols) {
    try { await prisma.$executeRawUnsafe(sql) } catch (_) { /* coluna já existe */ }
  }
  console.log('✅ Schema verificado')
}

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
