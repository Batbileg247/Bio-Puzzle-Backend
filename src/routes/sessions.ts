import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const getUserByClerkId = (clerkId: string) =>
  prisma.user.findUnique({ where: { clerkId } })

// GET /sessions
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await getUserByClerkId(req.userId!)
  if (!user) { res.status(404).json({ error: 'User not found' }); return }

  const sessions = await prisma.gameSession.findMany({
    where: { userId: user.id },
    include: { level: true },
  })
  res.json(sessions)
})

// POST /sessions
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByClerkId(req.userId!)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    const { levelId, currentState } = req.body
    const session = await prisma.gameSession.upsert({
      where: { userId_levelId: { userId: user.id, levelId } },
      update: { currentState, updatedAt: new Date() },
      create: { userId: user.id, levelId, currentState },
    })
    res.status(201).json(session)
  } catch {
    res.status(400).json({ error: 'Invalid data' })
  }
})

// PATCH /sessions/:id
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentState, isCompleted, timeElapsed, moves } = req.body
    const session = await prisma.gameSession.update({
      where: { id: req.params.id as string },
      data: { currentState, isCompleted, timeElapsed, moves },
    })
    res.json(session)
  } catch {
    res.status(404).json({ error: 'Session not found' })
  }
})

// DELETE /sessions/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.gameSession.delete({ where: { id: req.params.id as string } })
    res.json({ message: 'Session deleted' })
  } catch {
    res.status(404).json({ error: 'Session not found' })
  }
})

export default router
