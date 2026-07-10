"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.victimsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
exports.victimsRouter = (0, express_1.Router)();
exports.victimsRouter.use(auth_middleware_1.requireAuth);
exports.victimsRouter.get("/", async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || "1", 10);
        const pageSize = parseInt(req.query.pageSize || "20", 10);
        const { search } = req.query;
        const where = search
            ? { fullName: { contains: search, mode: "insensitive" } }
            : {};
        const [total, victims] = await Promise.all([
            prisma_1.prisma.victim.count({ where }),
            prisma_1.prisma.victim.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { firs: { include: { fir: { select: { firNumber: true, status: true } } } } },
            }),
        ]);
        res.json({ data: victims, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
    }
    catch (err) {
        next(err);
    }
});
exports.victimsRouter.get("/:id", async (req, res, next) => {
    try {
        const victim = await prisma_1.prisma.victim.findUnique({
            where: { id: req.params.id },
            include: { firs: { include: { fir: { include: { policeStation: true } } } } },
        });
        if (!victim)
            throw new error_middleware_1.ApiError(404, "Victim record not found");
        res.json(victim);
    }
    catch (err) {
        next(err);
    }
});
exports.victimsRouter.post("/", (0, audit_middleware_1.auditLog)("Victim"), async (req, res, next) => {
    try {
        const victim = await prisma_1.prisma.victim.create({ data: req.body });
        res.locals.entityId = victim.id;
        res.status(201).json(victim);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=victims.routes.js.map