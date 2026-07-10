"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
// Reference/lookup data used to populate dropdowns across the frontend
// (districts, police stations, crime types).
exports.metaRouter = (0, express_1.Router)();
exports.metaRouter.use(auth_middleware_1.requireAuth);
exports.metaRouter.get("/districts", async (_req, res, next) => {
    try {
        const districts = await prisma_1.prisma.district.findMany({ include: { state: true }, orderBy: { name: "asc" } });
        res.json(districts);
    }
    catch (err) {
        next(err);
    }
});
exports.metaRouter.get("/police-stations", async (req, res, next) => {
    try {
        const { districtId } = req.query;
        const stations = await prisma_1.prisma.policeStation.findMany({
            where: districtId ? { districtId } : {},
            orderBy: { name: "asc" },
        });
        res.json(stations);
    }
    catch (err) {
        next(err);
    }
});
exports.metaRouter.get("/crime-types", async (_req, res, next) => {
    try {
        const crimeTypes = await prisma_1.prisma.crimeType.findMany({ orderBy: { name: "asc" } });
        res.json(crimeTypes);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=meta.routes.js.map