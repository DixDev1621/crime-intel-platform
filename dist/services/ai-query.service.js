"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryDatabase = queryDatabase;
const prisma_1 = require("../config/prisma");
const prisma_query_builder_service_1 = require("./prisma-query-builder.service");
async function queryDatabase(question) {
    const q = question.toLowerCase();
    // =====================================================
    // OPEN FIRS
    // =====================================================
    if (q.includes("open fir")) {
        const firs = await prisma_1.prisma.fIR.findMany({
            where: {
                status: "OPEN",
            },
            include: {
                policeStation: {
                    include: {
                        district: true,
                    },
                },
            },
            take: 10,
        });
        if (!firs.length) {
            return "No open FIRs found.";
        }
        return firs
            .map((f) => `${f.firNumber} | ${f.policeStation.district.name} | ${f.summary}`)
            .join("\n");
    }
    // =====================================================
    // TOP ACCUSED
    // =====================================================
    if (q.includes("risk score") ||
        q.includes("highest risk") ||
        q.includes("top accused")) {
        const accused = await prisma_1.prisma.accused.findMany({
            orderBy: {
                riskScore: "desc",
            },
            take: 10,
        });
        if (!accused.length) {
            return "No accused found.";
        }
        return accused
            .map((a) => `${a.fullName} (Risk Score: ${a.riskScore})`)
            .join("\n");
    }
    // =====================================================
    // DYNAMIC QUERY ENGINE
    // =====================================================
    const where = await (0, prisma_query_builder_service_1.buildPrismaWhere)(question);
    if (Object.keys(where).length > 0) {
        const crimes = await prisma_1.prisma.crime.findMany({
            where,
            include: {
                district: true,
                crimeType: true,
                fir: true,
            },
            orderBy: {
                occurredAt: "desc",
            },
            take: 10,
        });
        if (!crimes.length) {
            return "No matching records found.";
        }
        return crimes
            .map((c) => `
District : ${c.district.name}
Crime    : ${c.crimeType.name}
Date     : ${c.occurredAt.toDateString()}
FIR      : ${c.fir?.firNumber ?? "N/A"}
Status   : ${c.fir?.status ?? "N/A"}
Description : ${c.description}
`)
            .join("\n---------------------------\n");
    }
    // =====================================================
    // TOTAL FIRS
    // =====================================================
    if (q.includes("total fir")) {
        const count = await prisma_1.prisma.fIR.count();
        return `Total FIRs in database: ${count}`;
    }
    return null;
}
//# sourceMappingURL=ai-query.service.js.map