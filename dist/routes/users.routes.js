"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.use(auth_middleware_1.requireAuth);
// Any authenticated user can update their own language/theme preference.
exports.usersRouter.patch("/me/preferences", (0, audit_middleware_1.auditLog)("User"), async (req, res, next) => {
    try {
        const { preferredLang } = req.body;
        const user = await prisma_1.prisma.user.update({
            where: { id: req.user.userId },
            data: { ...(preferredLang ? { preferredLang } : {}) },
            select: { id: true, preferredLang: true },
        });
        res.json(user);
    }
    catch (err) {
        next(err);
    }
});
// Admin-only user management
exports.usersRouter.get("/", (0, auth_middleware_1.requireRole)("ADMIN"), async (_req, res, next) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            select: {
                id: true, fullName: true, email: true, badgeNumber: true, role: true,
                isActive: true, lastLoginAt: true, policeStation: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(users);
    }
    catch (err) {
        next(err);
    }
});
exports.usersRouter.patch("/:id/status", (0, auth_middleware_1.requireRole)("ADMIN"), (0, audit_middleware_1.auditLog)("User"), async (req, res, next) => {
    try {
        const { isActive } = req.body;
        const user = await prisma_1.prisma.user.update({ where: { id: req.params.id }, data: { isActive } });
        res.json({ id: user.id, isActive: user.isActive });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=users.routes.js.map