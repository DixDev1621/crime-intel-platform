"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hotspotsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.hotspotsRouter = (0, express_1.Router)();
exports.hotspotsRouter.use(auth_middleware_1.requireAuth);
// GET /api/hotspots?districtId=&year=
exports.hotspotsRouter.get("/", async (req, res, next) => {
    try {
        const { districtId, year } = req.query;
        const where = {
            ...(districtId ? { districtId } : {}),
            ...(year
                ? {
                    windowStart: { gte: new Date(`${year}-01-01`) },
                    windowEnd: { lte: new Date(`${parseInt(year) + 1}-01-01`) },
                }
                : {}),
        };
        const hotspots = await prisma_1.prisma.hotspot.findMany({ where, include: { district: true } });
        res.json(hotspots);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/hotspots/crime-map — raw crime coordinates for marker/cluster maps
exports.hotspotsRouter.get("/crime-map", async (req, res, next) => {
    try {
        const { crimeTypeId, districtId } = req.query;
        const crimes = await prisma_1.prisma.crime.findMany({
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
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=hotspots.routes.js.map