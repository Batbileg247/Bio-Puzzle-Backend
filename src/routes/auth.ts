import { Router, Request, Response } from 'express'
import { Webhook } from 'svix'
import { prisma } from '../lib/prisma'

const router = Router()

// POST /auth/webhook — Clerk calls this when users are created/deleted
router.post('/webhook', async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    res.status(500).json({ error: 'Webhook secret not configured' })
    return
  }

  const svix_id = req.headers['svix-id'] as string
  const svix_timestamp = req.headers['svix-timestamp'] as string
  const svix_signature = req.headers['svix-signature'] as string

  if (!svix_id || !svix_timestamp || !svix_signature) {
    res.status(400).json({ error: 'Missing svix headers' })
    return
  }

  try {
    const wh = new Webhook(WEBHOOK_SECRET)
    const evt = wh.verify(JSON.stringify(req.body), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as any

    if (evt.type === 'user.created') {
      const { id, email_addresses, username } = evt.data
      const email = email_addresses[0].email_address
      await prisma.user.create({
        data: {
          clerkId: id,
          email,
          username: username ?? email.split('@')[0],
        },
      })
    }

    if (evt.type === 'user.deleted') {
      await prisma.user.delete({
        where: { clerkId: evt.data.id },
      })
    }

    res.json({ received: true })
  } catch (error) {
    res.status(400).json({ error: 'Webhook verification failed' })
  }
})

export default router
