import { Router } from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { prisma } from "../config/prisma";
import { signToken } from "../utils/jwt";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { ApiError } from "../middleware/error.middleware";

export const authRouter = Router();

authRouter.post(
  "/login",
  body("email").isEmail(),
  body("password").isString().isLength({ min: 6 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new ApiError(400, "Invalid email or password format");

      const { email, password } = req.body as { email: string; password: string };
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) throw new ApiError(401, "Invalid credentials");

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new ApiError(401, "Invalid credentials");

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = signToken({
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
    } catch (err) {
      next(err);
    }
  }
);

// Only admins can provision new accounts — this is a police intelligence
// system, not a self-serve consumer app.
authRouter.post(
  "/register",
  requireAuth,
  requireRole("ADMIN"),
  body("email").isEmail(),
  body("password").isLength({ min: 8 }),
  body("fullName").isString().notEmpty(),
  body("badgeNumber").isString().notEmpty(),
  body("role").isIn(["ADMIN", "INVESTIGATOR", "ANALYST", "SUPERVISOR", "POLICY_MAKER"]),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new ApiError(400, errors.array()[0].msg);

      const { email, password, fullName, badgeNumber, role, policeStationId } = req.body;
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: { email, passwordHash, fullName, badgeNumber, role, policeStationId },
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
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
    if (!user) throw new ApiError(404, "User not found");
    res.json(user);
  } catch (err) {
    next(err);
  }
});
