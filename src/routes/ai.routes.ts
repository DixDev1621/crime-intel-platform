import { Router } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { ApiError } from "../middleware/error.middleware";
import { getChatCompletion, ChatTurn } from "../services/ai.service";
import { getDatabaseContext } from "../services/database-ai.service";
import { queryDatabase } from "../services/ai-query.service";

export const aiRouter = Router();
aiRouter.use(requireAuth);

// List a user's chat sessions
aiRouter.get("/sessions", async (req, res, next) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.user!.userId },
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
  } catch (err) {
    next(err);
  }
});

// Create a new session
aiRouter.post("/sessions", async (req, res, next) => {
  try {
    console.log("========== AI SESSION ==========");
    console.log("JWT Payload:", req.user);

    const dbUser = await prisma.user.findUnique({
      where: {
        id: req.user!.userId,
      },
    });

    console.log("User found in DB:", dbUser);
    console.log("===============================");

    const { language } = req.body as { language?: string };

    const session = await prisma.chatSession.create({
      data: {
        userId: req.user!.userId,
        language: language || "en",
      },
    });

    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// Fetch full history of a session
aiRouter.get("/sessions/:id", async (req, res, next) => {
  try {
    const session = await prisma.chatSession.findFirst({
      where: {
        id: req.params!.id,
        userId: req.user!.userId,
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
      throw new ApiError(404, "Chat session not found");
    }

    res.json(session);
  } catch (err) {
    next(err);
  }
});

// Send a message and get an AI response
aiRouter.post(
  "/sessions/:id/messages",
  body("content").isString().notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        throw new ApiError(400, "Message content is required");
      }

      const session = await prisma.chatSession.findFirst({
        where: {
          id: req.params!.id,
          userId: req.user!.userId,
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
        throw new ApiError(404, "Chat session not found");
      }

      const { content } = req.body as { content: string };
      const dbContext = await getDatabaseContext(content);
      const dynamicResult = await queryDatabase(content);
      // Collect live database information for AI


      // STEP 1 - Verify the user's question reaches the backend
      console.log("USER QUESTION:", content);

      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: "USER",
          content,
        },
      });

      if (session.messages.length === 0) {
        await prisma.chatSession.update({
          where: {
            id: session.id,
          },
          data: {
            title: content.slice(0, 60),
          },
        });
      }

      const history: ChatTurn[] = [
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
    role: m.role.toLowerCase() as "user" | "assistant" | "system",
    content: m.content,
  })),

  {
    role: "user",
    content,
  },
];

      const reply = await getChatCompletion(history, session.language);

      const assistantMessage = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: "ASSISTANT",
          content: reply,
        },
      });

      await prisma.chatSession.update({
        where: {
          id: session.id,
        },
        data: {
          updatedAt: new Date(),
        },
      });

      res.status(201).json(assistantMessage);
    } catch (err) {
      next(err);
    }
  }
);