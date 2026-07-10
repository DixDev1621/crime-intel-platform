"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = auditLog;
const prisma_1 = require("../config/prisma");
/**
 * Writes an audit log after every successful non-GET request
 * made by an authenticated user.
 */
function auditLog(entityType) {
    return (req, res, next) => {
        res.on("finish", () => {
            if (req.method === "GET")
                return;
            if (!req.user)
                return;
            if (res.statusCode >= 400)
                return;
            const entityId = req.params?.id ??
                res.locals.entityId;
            prisma_1.prisma.auditLog
                .create({
                data: {
                    userId: req.user.userId,
                    action: `${req.method} ${req.baseUrl}${req.path}`,
                    entityType,
                    entityId,
                    ipAddress: req.ip,
                    metadata: ({
                        body: sanitize(req.body),
                    }),
                },
            })
                .catch((err) => {
                console.error("Audit log write failed:", err);
            });
        });
        next();
    };
}
function sanitize(body) {
    if (!body || typeof body !== "object") {
        return null;
    }
    const clone = { ...body };
    delete clone.password;
    delete clone.passwordHash;
    return clone;
}
//# sourceMappingURL=audit.middleware.js.map