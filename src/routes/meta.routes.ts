import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth.middleware";

// Reference/lookup data used to populate dropdowns across the frontend
// (districts, police stations, crime types).
export const metaRouter = Router();
metaRouter.use(requireAuth);

metaRouter.get("/districts", async (_req, res, next) => {
  try {
    const districts = await prisma.district.findMany({ include: { state: true }, orderBy: { name: "asc" } });
    res.json(districts);
  } catch (err) {
    next(err);
  }
});

metaRouter.get("/police-stations", async (req, res, next) => {
  try {
    const { districtId } = req.query as Record<string, string | undefined>;
    const stations = await prisma.policeStation.findMany({
      where: districtId ? { districtId } : {},
      orderBy: { name: "asc" },
    });
    res.json(stations);
  } catch (err) {
    next(err);
  }
});

metaRouter.get("/crime-types", async (_req, res, next) => {
  try {
    const crimeTypes = await prisma.crimeType.findMany({ orderBy: { name: "asc" } });
    res.json(crimeTypes);
  } catch (err) {
    next(err);
  }
});
