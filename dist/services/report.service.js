"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCrimeReport = generateCrimeReport;
const prisma_1 = require("../config/prisma");
async function generateCrimeReport(district) {
    const where = {};
    if (district) {
        const d = await prisma_1.prisma.district.findFirst({
            where: {
                name: district,
            },
        });
        if (d) {
            where.districtId = d.id;
        }
    }
    const totalCrimes = await prisma_1.prisma.crime.count({
        where,
    });
    const totalFirs = await prisma_1.prisma.fIR.count({
        where: district
            ? {
                policeStation: {
                    districtId: where.districtId,
                },
            }
            : {},
    });
    const openCases = await prisma_1.prisma.fIR.count({
        where: {
            status: "OPEN",
            ...(district && {
                policeStation: {
                    districtId: where.districtId,
                },
            }),
        },
    });
    const closedCases = await prisma_1.prisma.fIR.count({
        where: {
            status: "CLOSED",
            ...(district && {
                policeStation: {
                    districtId: where.districtId,
                },
            }),
        },
    });
    const topCrimeTypes = await prisma_1.prisma.crime.groupBy({
        by: ["crimeTypeId"],
        _count: true,
        orderBy: {
            _count: {
                crimeTypeId: "desc",
            },
        },
        take: 5,
    });
    return {
        district: district ?? "Karnataka",
        totalCrimes,
        totalFirs,
        openCases,
        closedCases,
        topCrimeTypes,
    };
}
//# sourceMappingURL=report.service.js.map