import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

export const auditRouter = Router();
auditRouter.use(requireAuth, requireRole("ADMIN", "SUPERVISOR"));

auditRouter.get("/", async (req, res, next) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const pageSize = parseInt((req.query.pageSize as string) || "50", 10);
    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { fullName: true, badgeNumber: true, role: true } } },
      }),
    ]);
    res.json({ data: logs, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    next(err);
  }
});
