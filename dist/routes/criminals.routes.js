"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criminalsRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
exports.criminalsRouter = (0, express_1.Router)();
exports.criminalsRouter.use(auth_middleware_1.requireAuth);
// GET /api/criminals?search=&minRisk=&page=&pageSize=
exports.criminalsRouter.get("/", async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || "1", 10);
        const pageSize = parseInt(req.query.pageSize || "20", 10);
        const { search, minRisk } = req.query;
        const where = {
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
            prisma_1.prisma.accused.count({ where }),
            prisma_1.prisma.accused.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { riskScore: "desc" },
                include: { firs: { include: { fir: { select: { firNumber: true, status: true } } } } },
            }),
        ]);
        res.json({ data: criminals, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
    }
    catch (err) {
        next(err);
    }
});
exports.criminalsRouter.get("/:id", async (req, res, next) => {
    try {
        const criminal = await prisma_1.prisma.accused.findUnique({
            where: { id: req.params.id },
            include: {
                firs: { include: { fir: { include: { policeStation: true, crime: { include: { crimeType: true } } } } } },
            },
        });
        if (!criminal)
            throw new error_middleware_1.ApiError(404, "Criminal profile not found");
        // Related relationships (for network view context on the profile page)
        const relationships = await prisma_1.prisma.relationship.findMany({
            where: {
                OR: [
                    { sourceType: "accused", sourceId: criminal.id },
                    { targetType: "accused", targetId: criminal.id },
                ],
            },
        });
        res.json({ ...criminal, relationships });
    }
    catch (err) {
        next(err);
    }
});
exports.criminalsRouter.post("/", (0, audit_middleware_1.auditLog)("Accused"), (0, express_validator_1.body)("fullName").isString().notEmpty(), async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            throw new error_middleware_1.ApiError(400, errors.array()[0].msg);
        const { fullName, aliases, gender, age, address, phone, photoUrl, behaviorProfile } = req.body;
        const criminal = await prisma_1.prisma.accused.create({
            data: { fullName, aliases: aliases || [], gender, age, address, phone, photoUrl, behaviorProfile },
        });
        res.locals.entityId = criminal.id;
        res.status(201).json(criminal);
    }
    catch (err) {
        next(err);
    }
});
exports.criminalsRouter.patch("/:id", (0, audit_middleware_1.auditLog)("Accused"), async (req, res, next) => {
    try {
        const criminal = await prisma_1.prisma.accused.update({ where: { id: req.params.id }, data: req.body });
        res.json(criminal);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=criminals.routes.js.map