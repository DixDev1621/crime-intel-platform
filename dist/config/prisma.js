"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// Single shared Prisma instance across the app (avoids exhausting DB
// connections in dev mode with hot-reload).
exports.prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
//# sourceMappingURL=prisma.js.map