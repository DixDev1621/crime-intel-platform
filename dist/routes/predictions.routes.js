"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictionsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
const ai_service_1 = require("../services/ai.service");
exports.predictionsRouter = (0, express_1.Router)();
exports.predictionsRouter.use(auth_middleware_1.requireAuth);
exports.predictionsRouter.get("/", async (req, res, next) => {
    try {
        const { districtId, crimeTypeId } = req.query;
        const predictions = await prisma_1.prisma.crimePrediction.findMany({
            where: { ...(districtId ? { districtId } : {}), ...(crimeTypeId ? { crimeTypeId } : {}) },
            include: { crimeType: true },
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        res.json(predictions);
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /api/predictions/generate
 * Explainable-AI forecast: pulls the last 12 months of crime counts for the
 * district/crime type, asks the AI model to forecast next month's risk with
 * a confidence score and reasoning grounded in the historical counts we send
 * it — every prediction stores the evidence it was based on.
 */
exports.predictionsRouter.post("/generate", (0, audit_middleware_1.auditLog)("CrimePrediction"), async (req, res, next) => {
    try {
        const { districtId, crimeTypeId } = req.body;
        const since = new Date();
        since.setMonth(since.getMonth() - 12);
        const crimes = await prisma_1.prisma.crime.findMany({
            where: { districtId, crimeTypeId, occurredAt: { gte: since } },
            select: { occurredAt: true },
        });
        const byMonth = {};
        for (const c of crimes) {
            const key = `${c.occurredAt.getFullYear()}-${String(c.occurredAt.getMonth() + 1).padStart(2, "0")}`;
            byMonth[key] = (byMonth[key] || 0) + 1;
        }
        const evidenceRefs = Object.entries(byMonth).sort(([a], [b]) => (a > b ? 1 : -1));
        const [district, crimeType] = await Promise.all([
            prisma_1.prisma.district.findUnique({ where: { id: districtId } }),
            prisma_1.prisma.crimeType.findUnique({ where: { id: crimeTypeId } }),
        ]);
        const prompt = `Historical monthly counts of "${crimeType?.name}" in ${district?.name} district for the last 12 months (month: count): ${JSON.stringify(evidenceRefs)}.
Based strictly on this data, forecast next month's relative risk level. Respond with EXACTLY three lines:
CONFIDENCE: <a number 0-100>
FORECAST: <one short sentence stating the predicted trend>
REASONING: <one or two sentences citing the specific months/counts that justify this>`;
        const aiResponse = await (0, ai_service_1.getChatCompletion)([{ role: "user", content: prompt }]);
        const confidenceMatch = aiResponse.match(/CONFIDENCE:\s*(\d+(\.\d+)?)/i);
        const forecastMatch = aiResponse.match(/FORECAST:\s*(.+)/i);
        const reasoningMatch = aiResponse.match(/REASONING:\s*(.+)/i);
        const predictedFor = new Date();
        predictedFor.setMonth(predictedFor.getMonth() + 1);
        const prediction = await prisma_1.prisma.crimePrediction.create({
            data: {
                crimeTypeId,
                districtId,
                predictedFor,
                confidenceScore: confidenceMatch ? parseFloat(confidenceMatch[1]) : 50,
                reasoning: reasoningMatch ? reasoningMatch[1] : aiResponse,
                evidenceRefs: { monthlyCounts: evidenceRefs, forecast: forecastMatch?.[1] || null },
            },
        });
        res.status(201).json(prediction);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=predictions.routes.js.map