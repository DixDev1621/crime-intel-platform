"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.ApiError = ApiError;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorHandler(err, req, res, next) {
    if (err instanceof ApiError) {
        return res.status(err.status).json({ error: err.message });
    }
    console.error("Unhandled error:", err);
    return res.status(500).json({ error: "Internal server error" });
}
function notFoundHandler(req, res) {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}
//# sourceMappingURL=error.middleware.js.map