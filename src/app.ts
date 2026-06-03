import 'express-async-errors'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import authRoutes        from './routes/auth'
import usersRoutes       from './routes/users'
import clientsRoutes     from './routes/clients'
import contractsRoutes   from './routes/contracts'
import diagnosticosRoutes from './routes/diagnosticos'
import financeiroRoutes  from './routes/financeiro'
import actionPlansRoutes from './routes/actionPlans'
import dashboardRoutes   from './routes/dashboard'
import agroCompletoRoutes from './routes/agroCompleto'
import pjCompletoRoutes   from './routes/pjCompleto'
import historicoRoutes    from './routes/historico'

const app = express()

// ── Middlewares globais ────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
  'https://af-gestao-xi.vercel.app',
  'https://af-gestao.vercel.app',
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origem não permitida — ${origin}`))
    }
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Rate limiting (evitar brute-force)
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
}))

// ── Health check ───────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'AF Gestão API',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}))

// ── Rotas da API ──────────────────────────────────────────────
app.use('/api/auth',         authRoutes)
app.use('/api/users',        usersRoutes)
app.use('/api/clients',      clientsRoutes)
app.use('/api/contracts',    contractsRoutes)
app.use('/api/diagnosticos', diagnosticosRoutes)
app.use('/api/financeiro',   financeiroRoutes)
app.use('/api/action-plans', actionPlansRoutes)
app.use('/api/dashboard',    dashboardRoutes)
app.use('/api/agro',         agroCompletoRoutes)
app.use('/api/pj',           pjCompletoRoutes)
app.use('/api/historico',    historicoRoutes)

// ── 404 ────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }))

// ── Error handler global ───────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.message)
  if (process.env.NODE_ENV === 'development') console.error(err.stack)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})

export default app
