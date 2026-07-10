import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";

export const financialRouter = Router();
financialRouter.use(requireAuth);

// GET /api/financial?firId=&flaggedOnly=true
financialRouter.get("/", async (req, res, next) => {
  try {
    const { firId, flaggedOnly } = req.query as Record<string, string | undefined>;
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        ...(firId ? { firId } : {}),
        ...(flaggedOnly === "true" ? { flagged: true } : {}),
      },
      include: { fir: { select: { firNumber: true } } },
      orderBy: { transactedAt: "desc" },
      take: 500,
    });
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

// Simple money-trail graph: accounts as nodes, transactions as edges
financialRouter.get("/money-trail/:firId", async (req, res, next) => {
  try {
    const txs = await prisma.financialTransaction.findMany({ where: { firId: req.params.firId } });
    const accountSet = new Set<string>();
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
  } catch (err) {
    next(err);
  }
});

financialRouter.post("/", auditLog("FinancialTransaction"), async (req, res, next) => {
  try {
    const tx = await prisma.financialTransaction.create({ data: req.body });
    res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
});
