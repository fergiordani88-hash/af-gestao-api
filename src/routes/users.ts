import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()
router.use(requireAuth, requireRole('ADMIN'))

const createSchema = z.object({
  name:     z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  role:     z.enum(['ADMIN', 'CONSULTOR', 'CLIENTE_EMPRESA', 'CLIENTE_RURAL']),
})

const updateSchema = z.object({
  name:   z.string().min(2).optional(),
  email:  z.string().email().optional(),
  role:   z.enum(['ADMIN', 'CONSULTOR', 'CLIENTE_EMPRESA', 'CLIENTE_RURAL']).optional(),
  active: z.boolean().optional(),
})

// GET /users
router.get('/', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, active: true, createdAt: true,
      _count: { select: { clients: true } },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
  return res.json(users)
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, name: true, email: true, role: true, active: true, createdAt: true,
      clients: { select: { id: true, name: true, status: true, segment: true }, take: 10 },
    },
  })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' })
  return res.json(user)
})

// POST /users
router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }

  const { name, email, password, role } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return res.status(409).json({ error: 'Já existe um usuário com este e-mail.' })

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase(), password: hashed, role },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  })

  return res.status(201).json(user)
})

// PATCH /users/:id
router.patch('/:id', async (req: Request, res: Response) => {
  // Admin não pode desativar a si mesmo
  if (req.params.id === req.user!.userId && req.body.active === false) {
    return res.status(400).json({ error: 'Você não pode desativar sua própria conta.' })
  }

  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }

  const exists = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!exists) return res.status(404).json({ error: 'Usuário não encontrado.' })

  if (parsed.data.email) {
    const conflict = await prisma.user.findFirst({
      where: { email: parsed.data.email.toLowerCase(), NOT: { id: req.params.id } }
    })
    if (conflict) return res.status(409).json({ error: 'E-mail já está em uso por outro usuário.' })
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      ...(parsed.data.email && { email: parsed.data.email.toLowerCase() }),
    },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  })

  return res.json(user)
})

// POST /users/:id/reset-password
router.post('/:id/reset-password', async (req: Request, res: Response) => {
  const { newPassword } = req.body
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter ao menos 6 caracteres.' })
  }

  const exists = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!exists) return res.status(404).json({ error: 'Usuário não encontrado.' })

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } })

  return res.json({ message: 'Senha redefinida com sucesso.' })
})

// DELETE /users/:id — desativa (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  if (req.params.id === req.user!.userId) {
    return res.status(400).json({ error: 'Você não pode excluir sua própria conta.' })
  }

  await prisma.user.update({ where: { id: req.params.id }, data: { active: false } })
  return res.status(204).send()
})

export default router
