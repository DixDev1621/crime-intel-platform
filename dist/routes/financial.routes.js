"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financialRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
exports.financialRouter = (0, express_1.Router)();
exports.financialRouter.use(auth_middleware_1.requireAuth);
// GET /api/financial?firId=&flaggedOnly=true
exports.financialRouter.get("/", async (req, res, next) => {
    try {
        const { firId, flaggedOnly } = req.query;
        const transactions = await prisma_1.prisma.financialTransaction.findMany({
            where: {
                ...(firId ? { firId } : {}),
                ...(flaggedOnly === "true" ? { flagged: true } : {}),
            },
            include: { fir: { select: { firNumber: true } } },
            orderBy: { transactedAt: "desc" },
            take: 500,
        });
        res.json(transactions);
    }
    catch (err) {
        next(err);
    }
});
// Simple money-trail graph: accounts as nodes, transactions as edges
exports.financialRouter.get("/money-trail/:firId", async (req, res, next) => {
    try {
        const txs = await prisma_1.prisma.financialTransaction.findMany({ where: { firId: req.params.firId } });
        const accountSet = new Set();
        txs.forEach((t) => {
            accountSet.add(t.fromAccount);
            accountSet.add(t.toAccount);
        });
        res.json({
            nodes: [...accountSet].map((acc) => ({ id: acc, label: acc })),
            edges: txs.map((t) => ({
                id: t.id,
                source: t.fromAccount,
                target: t.toAccount,
                amount: t.amount,
                currency: t.currency,
                flagged: t.flagged,
                transactedAt: t.transactedAt,
            })),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.financialRouter.post("/", (0, audit_middleware_1.auditLog)("FinancialTransaction"), async (req, res, next) => {
    try {
        const tx = await prisma_1.prisma.financialTransaction.create({ data: req.body });
        res.status(201).json(tx);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=financial.routes.js.map