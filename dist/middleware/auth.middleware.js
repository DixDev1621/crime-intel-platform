"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const jwt_1 = require("../utils/jwt");
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or malformed Authorization header" });
    }
    const token = header.slice("Bearer ".length);
    try {
        req.user = (0, jwt_1.verifyToken)(token);
        next();
    }
    catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
/** Restricts a route to a set of roles. Use after requireAuth. */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: "Not authenticated" });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Insufficient permissions for this action" });
        }
        next();
    };
}
//# sourceMappingURL=auth.middleware.js.map