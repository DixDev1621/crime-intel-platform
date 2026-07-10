"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
exports.firRouter = (0, express_1.Router)();
exports.firRouter.use(auth_middleware_1.requireAuth);
/**
 * GET /api/firs
 * Supports pagination, free-text search, and filters for status,
 * police station, district (via police station), and date range.
 */
exports.firRouter.get("/", (0, express_validator_1.query)("page").optional().isInt({ min: 1 }), (0, express_validator_1.query)("pageSize").optional().isInt({ min: 1, max: 100 }), async (req, res, next) => {
    try {
        const page = parseInt(req.query?.page || "1", 10);
        const pageSize = parseInt(req.query?.pageSize || "20", 10);
        const { search, status, policeStationId, dateFrom, dateTo } = req.query;
        const where = {
            ...(status ? { status: status } : {}),
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
            prisma_1.prisma.fIR.count({ where }),
            prisma_1.prisma.fIR.findMany({
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
    }
    catch (err) {
        next(err);
    }
});
exports.firRouter.get("/:id", async (req, res, next) => {
    try {
        const fir = await prisma_1.prisma.fIR.findUnique({
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
        if (!fir)
            throw new error_middleware_1.ApiError(404, "FIR not found");
        res.json(fir);
    }
    catch (err) {
        next(err);
    }
});
exports.firRouter.post("/", (0, audit_middleware_1.auditLog)("FIR"), (0, express_validator_1.body)("firNumber").isString().notEmpty(), (0, express_validator_1.body)("policeStationId").isUUID(), (0, express_validator_1.body)("summary").isString().notEmpty(), async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            throw new error_middleware_1.ApiError(400, errors.array()[0].msg);
        const { firNumber, policeStationId, summary, status } = req.body;
        const fir = await prisma_1.prisma.fIR.create({
            data: {
                firNumber,
                policeStationId,
                summary,
                status: status || "OPEN",
                createdById: req.user.userId,
            },
        });
        res.locals.entityId = fir.id;
        res.status(201).json(fir);
    }
    catch (err) {
        next(err);
    }
});
exports.firRouter.patch("/:id", (0, audit_middleware_1.auditLog)("FIR"), async (req, res, next) => {
    try {
        const { summary, status } = req.body;
        const fir = await prisma_1.prisma.fIR.update({
            where: { id: req.params.id },
            data: { ...(summary ? { summary } : {}), ...(status ? { status } : {}) },
        });
        res.json(fir);
    }
    catch (err) {
        next(err);
    }
});
exports.firRouter.delete("/:id", (0, audit_middleware_1.auditLog)("FIR"), async (req, res, next) => {
    try {
        await prisma_1.prisma.fIR.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=fir.routes.js.map