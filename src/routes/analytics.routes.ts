import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth.middleware";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

// Crime counts grouped by crime type
analyticsRouter.get("/by-crime-type", async (_req, res, next) => {
  try {
    const rows = await prisma.crime.groupBy({ by: ["crimeTypeId"], _count: { crimeTypeId: true } });
    const types = await prisma.crimeType.findMany();
    const map = new Map(types.map((t) => [t.id, t.name]));
    res.json(rows.map((r) => ({ crimeType: map.get(r.crimeTypeId) || "Unknown", count: r._count.crimeTypeId })));
  } catch (err) {
    next(err);
  }
});

// Crime counts grouped by district
analyticsRouter.get("/by-district", async (_req, res, next) => {
  try {
    const rows = await prisma.crime.groupBy({ by: ["districtId"], _count: { districtId: true } });
    const districts = await prisma.district.findMany();
    const map = new Map(districts.map((d) => [d.id, d.name]));
    res.json(rows.map((r) => ({ district: map.get(r.districtId) || "Unknown", count: r._count.districtId })));
  } catch (err) {
    next(err);
  }
});

// Victim demographics: age bands and gender split
analyticsRouter.get("/victim-demographics", async (_req, res, next) => {
  try {
    const victims = await prisma.victim.findMany({ select: { age: true, gender: true } });
    const genderCount: Record<string, number> = {};
    const ageBands: Record<string, number> = { "0-17": 0, "18-30": 0, "31-45": 0, "46-60": 0, "60+": 0 };

    for (const v of victims) {
      genderCount[v.gender] = (genderCount[v.gender] || 0) + 1;
      if (v.age == null) continue;
      if (v.age < 18) ageBands["0-17"]++;
      else if (v.age <= 30) ageBands["18-30"]++;
      else if (v.age <= 45) ageBands["31-45"]++;
      else if (v.age <= 60) ageBands["46-60"]++;
      else ageBands["60+"]++;
    }

    res.json({
      gender: Object.entries(genderCount).map(([gender, count]) => ({ gender, count })),
      ageBands: Object.entries(ageBands).map(([band, count]) => ({ band, count })),
    });
  } catch (err) {
    next(err);
  }
});

// Seasonal trend: crime counts by month-of-year (aggregated across all years)
analyticsRouter.get("/seasonal-trend", async (_req, res, next) => {
  try {
    const crimes = await prisma.crime.findMany({ select: { occurredAt: true } });
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const counts = new Array(12).fill(0);
    for (const c of crimes) counts[c.occurredAt.getMonth()]++;
    res.json(monthNames.map((month, i) => ({ month, count: counts[i] })));
  } catch (err) {
    next(err);
  }
});
