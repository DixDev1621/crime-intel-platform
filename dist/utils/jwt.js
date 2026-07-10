"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "8h");
if (!SECRET) {
    // Fail fast rather than silently signing tokens with `undefined`.
    throw new Error("JWT_SECRET is not set. Copy .env.example to .env and set it.");
}
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, SECRET);
}
//# sourceMappingURL=jwt.js.map