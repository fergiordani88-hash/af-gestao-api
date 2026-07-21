import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || !user.active) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' })
  }

  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' })
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '30d' } as jwt.SignOptions
  )

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toLowerCase() as string,
    },
  })
})

// GET /auth/me — retorna usuário logado
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' })

  return res.json({ ...user, role: user.role.toLowerCase() })
})

// POST /auth/change-password
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter ao menos 6 caracteres.' })
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' })

  const match = await bcrypt.compare(currentPassword, user.password)
  if (!match) return res.status(401).json({ error: 'Senha atual incorreta.' })

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  return res.json({ message: 'Senha alterada com sucesso.' })
})

export default router
