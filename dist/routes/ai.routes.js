"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const ai_service_1 = require("../services/ai.service");
const database_ai_service_1 = require("../services/database-ai.service");
const ai_query_service_1 = require("../services/ai-query.service");
exports.aiRouter = (0, express_1.Router)();
exports.aiRouter.use(auth_middleware_1.requireAuth);
// List a user's chat sessions
exports.aiRouter.get("/sessions", async (req, res, next) => {
    try {
        const sessions = await prisma_1.prisma.chatSession.findMany({
            where: { userId: req.user.userId },
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                title: true,
                language: true,
                updatedAt: true,
                createdAt: true,
            },
        });
        res.json(sessions);
    }
    catch (err) {
        next(err);
    }
});
// Create a new session
exports.aiRouter.post("/sessions", async (req, res, next) => {
    try {
        console.log("========== AI SESSION ==========");
        console.log("JWT Payload:", req.user);
        const dbUser = await prisma_1.prisma.user.findUnique({
            where: {
                id: req.user.userId,
            },
        });
        console.log("User found in DB:", dbUser);
        console.log("===============================");
        const { language } = req.body;
        const session = await prisma_1.prisma.chatSession.create({
            data: {
                userId: req.user.userId,
                language: language || "en",
            },
        });
        res.status(201).json(session);
    }
    catch (err) {
        next(err);
    }
});
// Fetch full history of a session
exports.aiRouter.get("/sessions/:id", async (req, res, next) => {
    try {
        const session = await prisma_1.prisma.chatSession.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.userId,
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });
        if (!session) {
            throw new error_middleware_1.ApiError(404, "Chat session not found");
        }
        res.json(session);
    }
    catch (err) {
        next(err);
    }
});
// Send a message and get an AI response
exports.aiRouter.post("/sessions/:id/messages", (0, express_validator_1.body)("content").isString().notEmpty(), async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new error_middleware_1.ApiError(400, "Message content is required");
        }
        const session = await prisma_1.prisma.chatSession.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.userId,
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });
        if (!session) {
            throw new error_middleware_1.ApiError(404, "Chat session not found");
        }
        const { content } = req.body;
        const dbContext = await (0, database_ai_service_1.getDatabaseContext)(content);
        const dynamicResult = await (0, ai_query_service_1.queryDatabase)(content);
        // Collect live database information for AI
        // STEP 1 - Verify the user's question reaches the backend
        console.log("USER QUESTION:", content);
        await prisma_1.prisma.chatMessage.create({
            data: {
                sessionId: session.id,
                role: "USER",
                content,
            },
        });
        if (session.messages.length === 0) {
            await prisma_1.prisma.chatSession.update({
                where: {
                    id: session.id,
                },
                data: {
                    title: content.slice(0, 60),
                },
            });
        }
        const history = [
            {
                role: "system",
                content: `
You are the AI Investigation Assistant for the Karnataka State Police.

If database information is provided below, answer ONLY using that information.

${dbContext.found ? `LIVE DATABASE:\n${dbContext.context}` : ""}

${dynamicResult ? `QUERY RESULT:\n${dynamicResult}` : ""}

If no database information is provided, answer normally and clearly mention when information is unavailable.
`,
            },
            ...session.messages.map((m) => ({
                role: m.role.toLowerCase(),
                content: m.content,
            })),
            {
                role: "user",
                content,
            },
        ];
        const reply = await (0, ai_service_1.getChatCompletion)(history, session.language);
        const assistantMessage = await prisma_1.prisma.chatMessage.create({
            data: {
                sessionId: session.id,
                role: "ASSISTANT",
                content: reply,
            },
        });
        await prisma_1.prisma.chatSession.update({
            where: {
                id: session.id,
            },
            data: {
                updatedAt: new Date(),
            },
        });
        res.status(201).json(assistantMessage);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=ai.routes.js.map