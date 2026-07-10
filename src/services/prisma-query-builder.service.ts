import { prisma } from "../config/prisma";

export async function buildPrismaWhere(question: string) {
  const q = question.toLowerCase();

  const where: any = {};

  // -------------------------
  // DISTRICT
  // -------------------------

  const districts = await prisma.district.findMany();

  for (const district of districts) {
    if (q.includes(district.name.toLowerCase())) {
      where.districtId = district.id;
      break;
    }
  }

  // -------------------------
  // CRIME TYPE
  // -------------------------

  const crimeTypes = await prisma.crimeType.findMany();

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