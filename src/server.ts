import 'dotenv/config'
import app from './app'
import { prisma } from './lib/prisma'

const PORT = Number(process.env.PORT ?? 3333)

async function start() {
  try {
    await prisma.$connect()
    console.log('✅ Banco de dados conectado')

    app.listen(PORT, () => {
      console.log('')
      console.log('🚀 AF Gestão API rodando!')
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
