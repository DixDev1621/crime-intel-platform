import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";

export const usersRouter = Router();
usersRouter.use(requireAuth);

// Any authenticated user can update their own language/theme preference.
usersRouter.patch("/me/preferences", auditLog("User"), async (req, res, next) => {
  try {
    const { preferredLang } = req.body as { preferredLang?: string };
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { ...(preferredLang ? { preferredLang } : {}) },
      select: { id: true, preferredLang: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Admin-only user management
usersRouter.get("/", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, fullName: true, email: true, badgeNumber: true, role: true,
        isActive: true, lastLoginAt: true, policeStation: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

usersRouter.patch("/:id/status", requireRole("ADMIN"), auditLog("User"), async (req, res, next) => {
  try {
    const { isActive } = req.body as { isActive: boolean };
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive } });
    res.json({ id: user.id, isActive: user.isActive });
  } catch (err) {
    next(err);
  }
});
