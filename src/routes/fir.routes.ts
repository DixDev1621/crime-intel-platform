import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { ApiError } from "../middleware/error.middleware";
import { Prisma, FIRStatus } from "@prisma/client";

export const firRouter = Router();
firRouter.use(requireAuth);

/**
 * GET /api/firs
 * Supports pagination, free-text search, and filters for status,
 * police station, district (via police station), and date range.
 */
firRouter.get(
  "/",
  query("page").optional().isInt({ min: 1 }),
  query("pageSize").optional().isInt({ min: 1, max: 100 }),
  async (req, res, next) => {
    try {
      const page = parseInt((req.query?.page as string) || "1", 10);
const pageSize = parseInt((req.query?.pageSize as string) || "20", 10);
      const { search, status, policeStationId, dateFrom, dateTo } = req.query as Record<
        string,
        string | undefined
      >;

      const where: Prisma.FIRWhereInput = {
        ...(status ? { status: status as FIRStatus } : {}),
        ...(policeStationId ? { policeStationId } : {}),
        ...(dateFrom || dateTo
          ? {
              filedAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { firNumber: { contains: search, mode: "insensitive" } },
                { summary: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const [total, firs] = await Promise.all([
        prisma.fIR.count({ where }),
        prisma.fIR.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { filedAt: "desc" },
          include: {
            policeStation: { include: { district: { include: { state: true } } } },
            crime: { include: { crimeType: true } },
            victims: { include: { victim: true } },
            accused: { include: { accused: true } },
            createdBy: { select: { fullName: true, badgeNumber: true } },
          },
        }),
      ]);

      res.json({
        data: firs,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    } catch (err) {
      next(err);
    }
  }
);

firRouter.get("/:id", async (req, res, next) => {
  try {
    const fir = await prisma.fIR.findUnique({
      where: { id: req.params.id },
      include: {
        policeStation: { include: { district: { include: { state: true } } } },
        crime: { include: { crimeType: true } },
        victims: { include: { victim: true } },
        accused: { include: { accused: true } },
        evidence: true,
        investigations: { include: { investigator: { select: { fullName: true } } } },
        financialTx: true,
        createdBy: { select: { fullName: true, badgeNumber: true } },
      },
    });
    if (!fir) throw new ApiError(404, "FIR not found");
    res.json(fir);
  } catch (err) {
    next(err);
  }
});

firRouter.post(
  "/",
  auditLog("FIR"),
  body("firNumber").isString().notEmpty(),
  body("policeStationId").isUUID(),
  body("summary").isString().notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new ApiError(400, errors.array()[0].msg);

      const { firNumber, policeStationId, summary, status } = req.body;
      const fir = await prisma.fIR.create({
        data: {
          firNumber,
          policeStationId,
          summary,
          status: status || "OPEN",
          createdById: req.user!.userId,
        },
      });
      res.locals.entityId = fir.id;
      res.status(201).json(fir);
    } catch (err) {
      next(err);
    }
  }
);

firRouter.patch("/:id", auditLog("FIR"), async (req, res, next) => {
  try {
    const { summary, status } = req.body;
    const fir = await prisma.fIR.update({
      where: { id: req.params.id },
      data: { ...(summary ? { summary } : {}), ...(status ? { status } : {}) },
    });
    res.json(fir);
  } catch (err) {
    next(err);
  }
});

firRouter.delete("/:id", auditLog("FIR"), async (req, res, next) => {
  try {
    await prisma.fIR.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
