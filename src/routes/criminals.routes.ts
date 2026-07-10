import { Router } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { ApiError } from "../middleware/error.middleware";
import { Prisma } from "@prisma/client";

export const criminalsRouter = Router();
criminalsRouter.use(requireAuth);

// GET /api/criminals?search=&minRisk=&page=&pageSize=
criminalsRouter.get("/", async (req, res, next) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const pageSize = parseInt((req.query.pageSize as string) || "20", 10);
    const { search, minRisk } = req.query as Record<string, string | undefined>;

    const where: Prisma.AccusedWhereInput = {
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { aliases: { has: search } },
            ],
          }
        : {}),
      ...(minRisk ? { riskScore: { gte: parseFloat(minRisk) } } : {}),
    };

    const [total, criminals] = await Promise.all([
      prisma.accused.count({ where }),
      prisma.accused.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { riskScore: "desc" },
        include: { firs: { include: { fir: { select: { firNumber: true, status: true } } } } },
      }),
    ]);

    res.json({ data: criminals, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    next(err);
  }
});

criminalsRouter.get("/:id", async (req, res, next) => {
  try {
    const criminal = await prisma.accused.findUnique({
      where: { id: req.params.id },
      include: {
        firs: { include: { fir: { include: { policeStation: true, crime: { include: { crimeType: true } } } } } },
      },
    });
    if (!criminal) throw new ApiError(404, "Criminal profile not found");

    // Related relationships (for network view context on the profile page)
    const relationships = await prisma.relationship.findMany({
      where: {
        OR: [
          { sourceType: "accused", sourceId: criminal.id },
          { targetType: "accused", targetId: criminal.id },
        ],
      },
    });

    res.json({ ...criminal, relationships });
  } catch (err) {
    next(err);
  }
});

criminalsRouter.post(
  "/",
  auditLog("Accused"),
  body("fullName").isString().notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new ApiError(400, errors.array()[0].msg);
      const { fullName, aliases, gender, age, address, phone, photoUrl, behaviorProfile } = req.body;
      const criminal = await prisma.accused.create({
        data: { fullName, aliases: aliases || [], gender, age, address, phone, photoUrl, behaviorProfile },
      });
      res.locals.entityId = criminal.id;
      res.status(201).json(criminal);
    } catch (err) {
      next(err);
    }
  }
);

criminalsRouter.patch("/:id", auditLog("Accused"), async (req, res, next) => {
  try {
    const criminal = await prisma.accused.update({ where: { id: req.params.id }, data: req.body });
    res.json(criminal);
  } catch (err) {
    next(err);
  }
});
