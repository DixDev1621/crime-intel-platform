import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { ApiError } from "../middleware/error.middleware";
import { Prisma } from "@prisma/client";

export const victimsRouter = Router();
victimsRouter.use(requireAuth);

victimsRouter.get("/", async (req, res, next) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const pageSize = parseInt((req.query.pageSize as string) || "20", 10);
    const { search } = req.query as Record<string, string | undefined>;

    const where: Prisma.VictimWhereInput = search
      ? { fullName: { contains: search, mode: "insensitive" } }
      : {};

    const [total, victims] = await Promise.all([
      prisma.victim.count({ where }),
      prisma.victim.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { firs: { include: { fir: { select: { firNumber: true, status: true } } } } },
      }),
    ]);

    res.json({ data: victims, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    next(err);
  }
});

victimsRouter.get("/:id", async (req, res, next) => {
  try {
    const victim = await prisma.victim.findUnique({
      where: { id: req.params.id },
      include: { firs: { include: { fir: { include: { policeStation: true } } } } },
    });
    if (!victim) throw new ApiError(404, "Victim record not found");
    res.json(victim);
  } catch (err) {
    next(err);
  }
});

victimsRouter.post("/", auditLog("Victim"), async (req, res, next) => {
  try {
    const victim = await prisma.victim.create({ data: req.body });
    res.locals.entityId = victim.id;
    res.status(201).json(victim);
  } catch (err) {
    next(err);
  }
});
