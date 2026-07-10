"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.analyticsRouter = (0, express_1.Router)();
exports.analyticsRouter.use(auth_middleware_1.requireAuth);
// Crime counts grouped by crime type
exports.analyticsRouter.get("/by-crime-type", async (_req, res, next) => {
    try {
        const rows = await prisma_1.prisma.crime.groupBy({ by: ["crimeTypeId"], _count: { crimeTypeId: true } });
        const types = await prisma_1.prisma.crimeType.findMany();
        const map = new Map(types.map((t) => [t.id, t.name]));
        res.json(rows.map((r) => ({ crimeType: map.get(r.crimeTypeId) || "Unknown", count: r._count.crimeTypeId })));
    }
    catch (err) {
        next(err);
    }
});
// Crime counts grouped by district
exports.analyticsRouter.get("/by-district", async (_req, res, next) => {
    try {
        const rows = await prisma_1.prisma.crime.groupBy({ by: ["districtId"], _count: { districtId: true } });
        const districts = await prisma_1.prisma.district.findMany();
        const map = new Map(districts.map((d) => [d.id, d.name]));
        res.json(rows.map((r) => ({ district: map.get(r.districtId) || "Unknown", count: r._count.districtId })));
    }
    catch (err) {
        next(err);
    }
});
// Victim demographics: age bands and gender split
exports.analyticsRouter.get("/victim-demographics", async (_req, res, next) => {
    try {
        const victims = await prisma_1.prisma.victim.findMany({ select: { age: true, gender: true } });
        const genderCount = {};
        const ageBands = { "0-17": 0, "18-30": 0, "31-45": 0, "46-60": 0, "60+": 0 };
        for (const v of victims) {
            genderCount[v.gender] = (genderCount[v.gender] || 0) + 1;
            if (v.age == null)
                continue;
            if (v.age < 18)
                ageBands["0-17"]++;
            else if (v.age <= 30)
                ageBands["18-30"]++;
            else if (v.age <= 45)
                ageBands["31-45"]++;
            else if (v.age <= 60)
                ageBands["46-60"]++;
            else
                ageBands["60+"]++;
        }
        res.json({
            gender: Object.entries(genderCount).map(([gender, count]) => ({ gender, count })),
            ageBands: Object.entries(ageBands).map(([band, count]) => ({ band, count })),
        });
    }
    catch (err) {
        next(err);
    }
});
// Seasonal trend: crime counts by month-of-year (aggregated across all years)
exports.analyticsRouter.get("/seasonal-trend", async (_req, res, next) => {
    try {
        const crimes = await prisma_1.prisma.crime.findMany({ select: { occurredAt: true } });
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const counts = new Array(12).fill(0);
        for (const c of crimes)
            counts[c.occurredAt.getMonth()]++;
        res.json(monthNames.map((month, i) => ({ month, count: counts[i] })));
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=analytics.routes.js.map