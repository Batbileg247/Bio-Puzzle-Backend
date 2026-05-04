import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const getUserByClerkId = (clerkId: string) =>
  prisma.user.findUnique({ where: { clerkId } });

// GET /levels — all levels for the authenticated user
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

// GET /levels/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await getUserByClerkId(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const level = await prisma.level.findUnique({
    where: { id: req.params.id as string },
  });
  if (!level) {
    res.status(404).json({ error: "Level not found" });
    return;
  }
  if (level.userId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(level);
});

// POST /levels
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByClerkId(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { chapterId, levelName, data, scores } = req.body;
    const level = await prisma.level.create({
      data: {
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

// PATCH /levels/:id
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
      res.status(404).json({ error: "Level not found" });
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
    res.status(404).json({ error: "Level not found" });
  }
});

// DELETE /levels/:id
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
      res.status(404).json({ error: "Level not found" });
      return;
    }
    if (existing.userId !== user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await prisma.level.delete({ where: { id: req.params.id as string } });
    res.json({ message: "Level deleted" });
  } catch {
    res.status(404).json({ error: "Level not found" });
  }
});

export default router;
