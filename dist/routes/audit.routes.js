"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.auditRouter = (0, express_1.Router)();
exports.auditRouter.use(auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)("ADMIN", "SUPERVISOR"));
exports.auditRouter.get("/", async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || "1", 10);
        const pageSize = parseInt(req.query.pageSize || "50", 10);
        const [total, logs] = await Promise.all([
            prisma_1.prisma.auditLog.count(),
            prisma_1.prisma.auditLog.findMany({
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: "desc" },
                include: { user: { select: { fullName: true, badgeNumber: true, role: true } } },
            }),
        ]);
        res.json({ data: logs, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=audit.routes.js.map