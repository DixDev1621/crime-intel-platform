import { prisma } from "../config/prisma";

export async function generateCrimeReport(district?: string) {
  const where: any = {};

  if (district) {
    const d = await prisma.district.findFirst({
      where: {
        name: district,
      },
    });

    if (d) {
      where.districtId = d.id;
    }
  }

  const totalCrimes = await prisma.crime.count({
    where,
  });

  const totalFirs = await prisma.fIR.count({
    where: district
      ? {
          policeStation: {
            districtId: where.districtId,
          },
        }
      : {},
  });

  const openCases = await prisma.fIR.count({
    where: {
      status: "OPEN",
      ...(district && {
        policeStation: {
          districtId: where.districtId,
        },
      }),
    },
  });

  const closedCases = await prisma.fIR.count({
    where: {
      status: "CLOSED",
      ...(district && {
        policeStation: {
          districtId: where.districtId,
        },
      }),
    },
  });

  const topCrimeTypes = await prisma.crime.groupBy({
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