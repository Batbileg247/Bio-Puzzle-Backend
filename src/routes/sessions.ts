import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const getUserByClerkId = (clerkId: string) =>
  prisma.user.findUnique({ where: { clerkId } });

// GET /sessions — all of the authenticated user's level sessions
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await getUserByClerkId(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const levels = await prisma.level.findMany({
    where: { userId: user.id },
    include: { chapter: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json(levels);
});

// GET /sessions/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await getUserByClerkId(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const level = await prisma.level.findUnique({
    where: { id: req.params.id as string },
    include: { chapter: true },
  });
  if (!level) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (level.userId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(level);
});

// POST /sessions — create or update a level session (upsert by userId + chapterId)
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByClerkId(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { chapterId, levelName, data, scores } = req.body;

    const level = await prisma.level.upsert({
      where: { userId_chapterId: { userId: user.id, chapterId } },
      update: { data, updatedAt: new Date() },
      create: {
        userId: user.id,
        chapterId,
        levelName,
        data,
        scores: scores ?? 0,
      },
    });
    res.status(201).json(level);
  } catch {
    res.status(400).json({ error: "Invalid data" });
  }
});

// PATCH /sessions/:id — update progress
router.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByClerkId(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const existing = await prisma.level.findUnique({
      where: { id: req.params.id as string },
    });
    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (existing.userId !== user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { data, isCompleted, timeElapsed, moves, scores } = req.body;
    const level = await prisma.level.update({
      where: { id: req.params.id as string },
      data: { data, isCompleted, timeElapsed, moves, scores },
    });
    res.json(level);
  } catch {
    res.status(404).json({ error: "Session not found" });
  }
});

// DELETE /sessions/:id
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByClerkId(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const existing = await prisma.level.findUnique({
      where: { id: req.params.id as string },
    });
    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (existing.userId !== user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await prisma.level.delete({ where: { id: req.params.id as string } });
    res.json({ message: "Session deleted" });
  } catch {
    res.status(404).json({ error: "Session not found" });
  }
});

export default router;
