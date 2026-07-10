import { prisma } from "../config/prisma";
import { buildPrismaWhere } from "./prisma-query-builder.service";

export async function queryDatabase(
  question: string
): Promise<string | null> {
  const q = question.toLowerCase();

  // =====================================================
  // OPEN FIRS
  // =====================================================

  if (q.includes("open fir")) {
    const firs = await prisma.fIR.findMany({
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
      .map(
        (f) =>
          `${f.firNumber} | ${f.policeStation.district.name} | ${f.summary}`
      )
      .join("\n");
  }

  // =====================================================
  // TOP ACCUSED
  // =====================================================

  if (
    q.includes("risk score") ||
    q.includes("highest risk") ||
    q.includes("top accused")
  ) {
    const accused = await prisma.accused.findMany({
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

  const where = await buildPrismaWhere(question);

  if (Object.keys(where).length > 0) {
    const crimes = await prisma.crime.findMany({
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
      .map(
        (c) => `
District : ${c.district.name}
Crime    : ${c.crimeType.name}
Date     : ${c.occurredAt.toDateString()}
FIR      : ${c.fir?.firNumber ?? "N/A"}
Status   : ${c.fir?.status ?? "N/A"}
Description : ${c.description}
`
      )
      .join("\n---------------------------\n");
  }

  // =====================================================
  // TOTAL FIRS
  // =====================================================

  if (q.includes("total fir")) {
    const count = await prisma.fIR.count();
    return `Total FIRs in database: ${count}`;
  }

  return null;
}