import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: req.userId },
      select: { id: true, username: true, email: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.body;
    const user = await prisma.user.update({
      where: { clerkId: req.userId },
      data: { username },
      select: { id: true, username: true, email: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({ where: { clerkId: req.userId } });
    res.json({ message: "User deleted" });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});
export default router;
