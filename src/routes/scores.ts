import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const getUserByClerkId = (clerkId: string) =>
  prisma.user.findUnique({ where: { clerkId } })

// GET /scores/leaderboard/:levelId
router.get('/leaderboard/:levelId', async (req: Request, res: Response) => {
  const scores = await prisma.score.findMany({
    where: { levelId: Number(req.params.levelId) },
    orderBy: { points: 'desc' },
    take: 10,
    include: { user: { select: { username: true } } },
  })
  res.json(scores)
})

// GET /scores/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await getUserByClerkId(req.userId!)
  if (!user) { res.status(404).json({ error: 'User not found' }); return }

  const scores = await prisma.score.findMany({
    where: { userId: user.id },
    include: { level: true },
    orderBy: { completedAt: 'desc' },
  })
  res.json(scores)
})

// POST /scores
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByClerkId(req.userId!)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    const { levelId, points, timeSeconds } = req.body
    const score = await prisma.score.create({
      data: { userId: user.id, levelId, points, timeSeconds },
    })
    res.status(201).json(score)
  } catch {
    res.status(400).json({ error: 'Invalid data' })
  }
})

// DELETE /scores/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.score.delete({ where: { id: req.params.id as string} })
    res.json({ message: 'Score deleted' })
  } catch {
    res.status(404).json({ error: 'Score not found' })
  }
})

export default router
