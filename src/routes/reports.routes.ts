import { Router } from "express";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { ApiError } from "../middleware/error.middleware";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

// GET /api/reports/fir/:id/pdf — case summary as a downloadable PDF
reportsRouter.get("/fir/:id/pdf", async (req, res, next) => {
  try {
    const fir = await prisma.fIR.findUnique({
      where: { id: req.params.id },
      include: {
        policeStation: { include: { district: true } },
        crime: { include: { crimeType: true } },
        victims: { include: { victim: true } },
        accused: { include: { accused: true } },
        evidence: true,
      },
    });
    if (!fir) throw new ApiError(404, "FIR not found");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fir.firNumber.replace(/\//g, "-")}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
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
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/firs/excel — filtered FIR export as .xlsx
reportsRouter.get("/firs/excel", async (req, res, next) => {
  try {
    const { status } = req.query as Record<string, string | undefined>;
    const firs = await prisma.fIR.findMany({
      where: status ? { status: status as any } : {},
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
  } catch (err) {
    next(err);
  }
});
