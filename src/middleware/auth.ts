import { clerkMiddleware, getAuth } from '@clerk/express'
import { Request, Response, NextFunction } from 'express'

export const clerkAuth = clerkMiddleware()

export interface AuthRequest extends Request {
  userId?: string
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  req.userId = userId
  next()
}
