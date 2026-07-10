import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

/**
 * Writes an audit log after every successful non-GET request
 * made by an authenticated user.
 */
export function auditLog(entityType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on("finish", () => {
      if (req.method === "GET") return;
      if (!req.user) return;
      if (res.statusCode >= 400) return;

      const entityId =
        req.params?.id ??
        (res.locals.entityId as string | undefined);

      prisma.auditLog
        .create({
          data: {
            userId: req.user.userId,
            action: `${req.method} ${req.baseUrl}${req.path}`,
            entityType,
            entityId,
            ipAddress: req.ip,
            metadata: ({
              body: sanitize(req.body),
            }) as Prisma.InputJsonValue,
          },
        })
        .catch((err) => {
          console.error("Audit log write failed:", err);
        });
    });

    next();
  };
}

function sanitize(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const clone = { ...(body as Record<string, unknown>) };

  delete clone.password;
  delete clone.passwordHash;

  return clone;
}