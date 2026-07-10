import { prisma } from "../config/prisma";

export interface DatabaseContext {
  found: boolean;
  context: string;
}

export async function getDatabaseContext(
  question: string
): Promise<DatabaseContext> {
  const q = question.toLowerCase();

  // --------------------------------------------------
  // Total FIRs
  // --------------------------------------------------
  if (q.includes("fir") && (q.includes("how many") || q.includes("total"))) {
    const count = await prisma.fIR.count();

    return {
      found: true,
      context: `The live database currently contains ${count} FIRs.`,
    };
  }

  // --------------------------------------------------
  // Total Accused
  // --------------------------------------------------
  if (
    q.includes("accused") &&
    (q.includes("how many") || q.includes("total"))
  ) {
    const count = await prisma.accused.count();

    return {
      found: true,
      context: `The live database currently contains ${count} accused persons.`,
    };
  }

  // --------------------------------------------------
  // Total Victims
  // --------------------------------------------------
  if (
    q.includes("victim") &&
    (q.includes("how many") || q.includes("total"))
  ) {
    const count = await prisma.victim.count();

    return {
      found: true,
      context: `The live database currently contains ${count} victims.`,
    };
  }

  // --------------------------------------------------
  // Total Police Stations
  // --------------------------------------------------
  if (
    q.includes("police station") &&
    (q.includes("how many") || q.includes("total"))
  ) {
    const count = await prisma.policeStation.count();

    return {
      found: true,
      context: `There are ${count} police stations in the database.`,
    };
  }

  // --------------------------------------------------
  // Highest Theft District
  // --------------------------------------------------
  if (
    q.includes("theft") &&
    (q.includes("highest") ||
      q.includes("most") ||
      q.includes("top"))
  ) {
    const theftType = await prisma.crimeType.findUnique({
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

    const crimes = await prisma.crime.findMany({
      where: {
        crimeTypeId: theftType.id,
      },
      include: {
        district: true,
      },
    });

    const counts = new Map<string, number>();

    for (const crime of crimes) {
      counts.set(
        crime.district.name,
        (counts.get(crime.district.name) || 0) + 1
      );
    }

    const ranking = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const summary = ranking
      .map(
        ([district, count], index) =>
          `${index + 1}. ${district} - ${count} theft case(s)`
      )
      .join("\n");

    return {
      found: true,
      context: "Live theft statistics from the database:\n\n" + summary,
    };
  }

  // --------------------------------------------------
  // Latest FIR Summary
  // --------------------------------------------------
  if (
    q.includes("latest") ||
    q.includes("recent") ||
    q.includes("summarize")
  ) {
    const latestFirs = await prisma.fIR.findMany({
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
      .map(
        (fir, index) => `
${index + 1}.
FIR Number: ${fir.firNumber}
District: ${fir.policeStation.district.name}
Police Station: ${fir.policeStation.name}
Crime: ${fir.crime?.crimeType?.name ?? "Unknown"}
Status: ${fir.status}
Filed At: ${fir.filedAt.toDateString()}
Summary: ${fir.summary}
`
      )
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