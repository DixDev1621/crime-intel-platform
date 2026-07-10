"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPrismaWhere = buildPrismaWhere;
const prisma_1 = require("../config/prisma");
async function buildPrismaWhere(question) {
    const q = question.toLowerCase();
    const where = {};
    // -------------------------
    // DISTRICT
    // -------------------------
    const districts = await prisma_1.prisma.district.findMany();
    for (const district of districts) {
        if (q.includes(district.name.toLowerCase())) {
            where.districtId = district.id;
            break;
        }
    }
    // -------------------------
    // CRIME TYPE
    // -------------------------
    const crimeTypes = await prisma_1.prisma.crimeType.findMany();
    for (const type of crimeTypes) {
        if (q.includes(type.name.toLowerCase())) {
            where.crimeTypeId = type.id;
            break;
        }
    }
    // -------------------------
    // STATUS
    // -------------------------
    if (q.includes("open")) {
        where.fir = {
            is: {
                status: "OPEN",
            },
        };
    }
    if (q.includes("closed")) {
        where.fir = {
            is: {
                status: "CLOSED",
            },
        };
    }
    if (q.includes("chargesheet")) {
        where.fir = {
            is: {
                status: "CHARGESHEET_FILED",
            },
        };
    }
    return where;
}
//# sourceMappingURL=prisma-query-builder.service.js.map