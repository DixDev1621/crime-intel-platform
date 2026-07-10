import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { authRouter } from "./routes/auth.routes";
import { firRouter } from "./routes/fir.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { aiRouter } from "./routes/ai.routes";
import { criminalsRouter } from "./routes/criminals.routes";
import { victimsRouter } from "./routes/victims.routes";
import { networkRouter } from "./routes/network.routes";
import { analyticsRouter } from "./routes/analytics.routes";
import { hotspotsRouter } from "./routes/hotspots.routes";
import { financialRouter } from "./routes/financial.routes";
import { predictionsRouter } from "./routes/predictions.routes";
import { reportsRouter } from "./routes/reports.routes";
import { auditRouter } from "./routes/audit.routes";
import { usersRouter } from "./routes/users.routes";
import { metaRouter } from "./routes/meta.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app = express();
const PORT =
  process.env.X_ZOHO_CATALYST_LISTEN_PORT ||
  process.env.PORT ||
  4000;

// --- Security & platform middleware ---
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

app.options(/.*/, cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || "300", 10),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// --- Health check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "crime-intel-backend", time: new Date().toISOString() });
});

// --- Routes ---
app.use("/api/auth", authRouter);
app.use("/api/firs", firRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/ai", aiRouter);
app.use("/api/criminals", criminalsRouter);
app.use("/api/victims", victimsRouter);
app.use("/api/network", networkRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/hotspots", hotspotsRouter);
app.use("/api/financial", financialRouter);
app.use("/api/predictions", predictionsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/audit", auditRouter);
app.use("/api/users", usersRouter);
app.use("/api/meta", metaRouter);

// --- 404 + error handling (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Crime Intelligence API listening on port ${PORT}`);
});
