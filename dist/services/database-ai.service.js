"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseContext = getDatabaseContext;
const prisma_1 = require("../config/prisma");
async function getDatabaseContext(question) {
    const q = question.toLowerCase();
    // --------------------------------------------------
    // Total FIRs
    // --------------------------------------------------
    if (q.includes("fir") && (q.includes("how many") || q.includes("total"))) {
        const count = await prisma_1.prisma.fIR.count();
        return {
            found: true,
            context: `The live database currently contains ${count} FIRs.`,
        };
    }
    // --------------------------------------------------
    // Total Accused
    // --------------------------------------------------
    if (q.includes("accused") &&
        (q.includes("how many") || q.includes("total"))) {
        const count = await prisma_1.prisma.accused.count();
        return {
            found: true,
            context: `The live database currently contains ${count} accused persons.`,
        };
    }
    // --------------------------------------------------
    // Total Victims
    // --------------------------------------------------
    if (q.includes("victim") &&
        (q.includes("how many") || q.includes("total"))) {
        const count = await prisma_1.prisma.victim.count();
        return {
            found: true,
            context: `The live database currently contains ${count} victims.`,
        };
    }
    // --------------------------------------------------
    // Total Police Stations
    // --------------------------------------------------
    if (q.includes("police station") &&
        (q.includes("how many") || q.includes("total"))) {
        const count = await prisma_1.prisma.policeStation.count();
        return {
            found: true,
            context: `There are ${count} police stations in the database.`,
        };
    }
    // --------------------------------------------------
    // Highest Theft District
    // --------------------------------------------------
    if (q.includes("theft") &&
        (q.includes("highest") ||
            q.includes("most") ||
            q.includes("top"))) {
        const theftType = await prisma_1.prisma.crimeType.findUnique({
            where: {
                name: "Theft",
            },
        });
        if (!theftType) {
            return {
                found: true,
                context: "No Theft crime type exists in the database.",
            };
        }
        const crimes = await prisma_1.prisma.crime.findMany({
            where: {
                crimeTypeId: theftType.id,
            },
            include: {
                district: true,
            },
        });
        const counts = new Map();
        for (const crime of crimes) {
            counts.set(crime.district.name, (counts.get(crime.district.name) || 0) + 1);
        }
        const ranking = [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        const summary = ranking
            .map(([district, count], index) => `${index + 1}. ${district} - ${count} theft case(s)`)
            .join("\n");
        return {
            found: true,
            context: "Live theft statistics from the database:\n\n" + summary,
        };
    }
    // --------------------------------------------------
    // Latest FIR Summary
    // --------------------------------------------------
    if (q.includes("latest") ||
        q.includes("recent") ||
        q.includes("summarize")) {
        const latestFirs = await prisma_1.prisma.fIR.findMany({
            take: 10,
            orderBy: {
                filedAt: "desc",
            },
            include: {
                policeStation: {
                    include: {
                        district: true,
                    },
                },
                crime: {
                    include: {
                        crimeType: true,
                    },
                },
            },
        });
        if (latestFirs.length === 0) {
            return {
                found: true,
                context: "There are no FIRs in the database.",
            };
        }
        const summary = latestFirs
            .map((fir, index) => `
${index + 1}.
FIR Number: ${fir.firNumber}
District: ${fir.policeStation.district.name}
Police Station: ${fir.policeStation.name}
Crime: ${fir.crime?.crimeType?.name ?? "Unknown"}
Status: ${fir.status}
Filed At: ${fir.filedAt.toDateString()}
Summary: ${fir.summary}
`)
            .join("\n--------------------------------------\n");
        return {
            found: true,
            context: "Latest FIRs from the live database:\n\n" + summary,
        };
    }
    return {
        found: false,
        context: "",
    };
}
//# sourceMappingURL=database-ai.service.js.map