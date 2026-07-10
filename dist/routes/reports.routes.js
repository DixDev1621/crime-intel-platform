"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRouter = void 0;
const express_1 = require("express");
const pdfkit_1 = __importDefault(require("pdfkit"));
const XLSX = __importStar(require("xlsx"));
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
exports.reportsRouter = (0, express_1.Router)();
exports.reportsRouter.use(auth_middleware_1.requireAuth);
// GET /api/reports/fir/:id/pdf — case summary as a downloadable PDF
exports.reportsRouter.get("/fir/:id/pdf", async (req, res, next) => {
    try {
        const fir = await prisma_1.prisma.fIR.findUnique({
            where: { id: req.params.id },
            include: {
                policeStation: { include: { district: true } },
                crime: { include: { crimeType: true } },
                victims: { include: { victim: true } },
                accused: { include: { accused: true } },
                evidence: true,
            },
        });
        if (!fir)
            throw new error_middleware_1.ApiError(404, "FIR not found");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fir.firNumber.replace(/\//g, "-")}.pdf"`);
        const doc = new pdfkit_1.default({ margin: 50 });
        doc.pipe(res);
        doc.fontSize(18).text("Karnataka State Police — Case Summary", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`FIR Number: ${fir.firNumber}`);
        doc.text(`Status: ${fir.status}`);
        doc.text(`Police Station: ${fir.policeStation.name} (${fir.policeStation.district.name})`);
        doc.text(`Filed At: ${fir.filedAt.toDateString()}`);
        doc.moveDown();
        doc.fontSize(14).text("Summary");
        doc.fontSize(11).text(fir.summary);
        doc.moveDown();
        if (fir.crime) {
            doc.fontSize(14).text("Crime Details");
            doc.fontSize(11).text(`Type: ${fir.crime.crimeType.name}`);
            doc.text(fir.crime.description);
            doc.moveDown();
        }
        if (fir.victims.length) {
            doc.fontSize(14).text("Victims");
            fir.victims.forEach((v) => doc.fontSize(11).text(`- ${v.victim.fullName}`));
            doc.moveDown();
        }
        if (fir.accused.length) {
            doc.fontSize(14).text("Accused");
            fir.accused.forEach((a) => doc.fontSize(11).text(`- ${a.accused.fullName} (risk score: ${a.accused.riskScore})`));
            doc.moveDown();
        }
        if (fir.evidence.length) {
            doc.fontSize(14).text("Evidence");
            fir.evidence.forEach((e) => doc.fontSize(11).text(`- [${e.type}] ${e.title}`));
        }
        doc.end();
    }
    catch (err) {
        next(err);
    }
});
// GET /api/reports/firs/excel — filtered FIR export as .xlsx
exports.reportsRouter.get("/firs/excel", async (req, res, next) => {
    try {
        const { status } = req.query;
        const firs = await prisma_1.prisma.fIR.findMany({
            where: status ? { status: status } : {},
            include: { policeStation: { include: { district: true } }, crime: { include: { crimeType: true } } },
            take: 5000,
        });
        const rows = firs.map((f) => ({
            "FIR Number": f.firNumber,
            Status: f.status,
            "Police Station": f.policeStation.name,
            District: f.policeStation.district.name,
            "Crime Type": f.crime?.crimeType.name || "",
            "Filed At": f.filedAt.toISOString().slice(0, 10),
            Summary: f.summary,
        }));
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "FIRs");
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", 'attachment; filename="fir-export.xlsx"');
        res.send(buffer);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=reports.routes.js.map