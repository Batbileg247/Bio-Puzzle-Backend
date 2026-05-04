import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const getUserByClerkId = (clerkId: string) =>
  prisma.user.findUnique({ where: { clerkId } });

// GET /scores/leaderboard — top users by total score
router.get("/leaderboard", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { scores: "desc" },
    take: 10,
    select: { username: true, scores: true },
  });
  res.json(users);
});

// GET /scores/me — authenticated user's score + level breakdown
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await getUserByClerkId(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const levels = await prisma.level.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      levelName: true,
      scores: true,
      isCompleted: true,
      timeElapsed: true,
      moves: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ totalScore: user.scores, levels });
});

// POST /scores/submit — update score on a level and recalculate user total
router.post("/submit", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByClerkId(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { levelId, scores } = req.body;
    if (typeof scores !== "number") {
      res.status(400).json({ error: "scores must be a number" });
      return;
    }

    const level = await prisma.level.findUnique({ where: { id: levelId } });
    if (!level) {
      res.status(404).json({ error: "Level not found" });
      return;
    }
    if (level.userId !== user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Update level score
    await prisma.level.update({
      where: { id: levelId },
      data: { scores },
    });

    // Recalculate user's total score from all their levels
    const aggregate = await prisma.level.aggregate({
      where: { userId: user.id },
      _sum: { scores: true },
    });
    const totalScore = aggregate._sum.scores ?? 0;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { scores: totalScore },
      select: { id: true, username: true, scores: true },
    });

    res.json(updatedUser);
  } catch {
    res.status(400).json({ error: "Invalid data" });
  }
});

export default router;
