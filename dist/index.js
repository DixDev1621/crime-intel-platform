"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_routes_1 = require("./routes/auth.routes");
const fir_routes_1 = require("./routes/fir.routes");
const dashboard_routes_1 = require("./routes/dashboard.routes");
const ai_routes_1 = require("./routes/ai.routes");
const criminals_routes_1 = require("./routes/criminals.routes");
const victims_routes_1 = require("./routes/victims.routes");
const network_routes_1 = require("./routes/network.routes");
const analytics_routes_1 = require("./routes/analytics.routes");
const hotspots_routes_1 = require("./routes/hotspots.routes");
const financial_routes_1 = require("./routes/financial.routes");
const predictions_routes_1 = require("./routes/predictions.routes");
const reports_routes_1 = require("./routes/reports.routes");
const audit_routes_1 = require("./routes/audit.routes");
const users_routes_1 = require("./routes/users.routes");
const meta_routes_1 = require("./routes/meta.routes");
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT ||
    process.env.PORT ||
    4000;
// --- Security & platform middleware ---
app.use((0, helmet_1.default)());
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",");
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true,
}));
app.options(/.*/, (0, cors_1.default)());
app.use(express_1.default.json({ limit: "2mb" }));
app.use((0, morgan_1.default)(process.env.NODE_ENV === "development" ? "dev" : "combined"));
const limiter = (0, express_rate_limit_1.default)({
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
app.use("/api/auth", auth_routes_1.authRouter);
app.use("/api/firs", fir_routes_1.firRouter);
app.use("/api/dashboard", dashboard_routes_1.dashboardRouter);
app.use("/api/ai", ai_routes_1.aiRouter);
app.use("/api/criminals", criminals_routes_1.criminalsRouter);
app.use("/api/victims", victims_routes_1.victimsRouter);
app.use("/api/network", network_routes_1.networkRouter);
app.use("/api/analytics", analytics_routes_1.analyticsRouter);
app.use("/api/hotspots", hotspots_routes_1.hotspotsRouter);
app.use("/api/financial", financial_routes_1.financialRouter);
app.use("/api/predictions", predictions_routes_1.predictionsRouter);
app.use("/api/reports", reports_routes_1.reportsRouter);
app.use("/api/audit", audit_routes_1.auditRouter);
app.use("/api/users", users_routes_1.usersRouter);
app.use("/api/meta", meta_routes_1.metaRouter);
// --- 404 + error handling (must be last) ---
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
app.listen(PORT, () => {
    console.log(`Crime Intelligence API listening on port ${PORT}`);
});
//# sourceMappingURL=index.js.map