import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { Prisma } from "@prisma/client";

export const hotspotsRouter = Router();
hotspotsRouter.use(requireAuth);

// GET /api/hotspots?districtId=&year=
hotspotsRouter.get("/", async (req, res, next) => {
  try {
    const { districtId, year } = req.query as Record<string, string | undefined>;
    const where: Prisma.HotspotWhereInput = {
      ...(districtId ? { districtId } : {}),
      ...(year
        ? {
            windowStart: { gte: new Date(`${year}-01-01`) },
            windowEnd: { lte: new Date(`${parseInt(year) + 1}-01-01`) },
          }
        : {}),
    };
    const hotspots = await prisma.hotspot.findMany({ where, include: { district: true } });
    res.json(hotspots);
  } catch (err) {
    next(err);
  }
});

// GET /api/hotspots/crime-map — raw crime coordinates for marker/cluster maps
hotspotsRouter.get("/crime-map", async (req, res, next) => {
  try {
    const { crimeTypeId, districtId } = req.query as Record<string, string | undefined>;
    const crimes = await prisma.crime.findMany({
      where: {
        ...(crimeTypeId ? { crimeTypeId } : {}),
        ...(districtId ? { districtId } : {}),
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        occurredAt: true,
        crimeType: { select: { name: true, severity: true } },
        district: { select: { name: true } },
      },
      take: 2000,
    });
    res.json(crimes);
  } catch (err) {
    next(err);
  }
});
