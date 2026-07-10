"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const express_validator_1 = require("express-validator");
const prisma_1 = require("../config/prisma");
const jwt_1 = require("../utils/jwt");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/login", (0, express_validator_1.body)("email").isEmail(), (0, express_validator_1.body)("password").isString().isLength({ min: 6 }), async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            throw new error_middleware_1.ApiError(400, "Invalid email or password format");
        const { email, password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive)
            throw new error_middleware_1.ApiError(401, "Invalid credentials");
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid)
            throw new error_middleware_1.ApiError(401, "Invalid credentials");
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const token = (0, jwt_1.signToken)({
            userId: user.id,
            role: user.role,
            badgeNumber: user.badgeNumber,
        });
        res.json({
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                badgeNumber: user.badgeNumber,
                preferredLang: user.preferredLang,
                policeStationId: user.policeStationId,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// Only admins can provision new accounts — this is a police intelligence
// system, not a self-serve consumer app.
exports.authRouter.post("/register", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)("ADMIN"), (0, express_validator_1.body)("email").isEmail(), (0, express_validator_1.body)("password").isLength({ min: 8 }), (0, express_validator_1.body)("fullName").isString().notEmpty(), (0, express_validator_1.body)("badgeNumber").isString().notEmpty(), (0, express_validator_1.body)("role").isIn(["ADMIN", "INVESTIGATOR", "ANALYST", "SUPERVISOR", "POLICY_MAKER"]), async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            throw new error_middleware_1.ApiError(400, errors.array()[0].msg);
        const { email, password, fullName, badgeNumber, role, policeStationId } = req.body;
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.prisma.user.create({
            data: { email, passwordHash, fullName, badgeNumber, role, policeStationId },
        });
        res.status(201).json({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.authRouter.get("/me", auth_middleware_1.requireAuth, async (req, res, next) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                badgeNumber: true,
                preferredLang: true,
                policeStationId: true,
            },
        });
        if (!user)
            throw new error_middleware_1.ApiError(404, "User not found");
        res.json(user);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=auth.routes.js.map