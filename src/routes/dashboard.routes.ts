import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth.middleware";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

// ======================================================
// Dashboard Summary
// ======================================================

dashboardRouter.get("/summary", async (_req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      todaysCrimes,
      pendingFirs,
      mostWanted,
      recentInvestigations,
      statusBreakdown,
    ] = await Promise.all([
      prisma.crime.count({
        where: {
          occurredAt: {
            gte: startOfToday,
          },
        },
      }),

      prisma.fIR.count({
        where: {
          status: {
            in: ["OPEN", "UNDER_INVESTIGATION"],
          },
        },
      }),

      prisma.accused.findMany({
        orderBy: {
          riskScore: "desc",
        },
        take: 5,
        select: {
          id: true,
          fullName: true,
          riskScore: true,
          photoUrl: true,
        },
      }),

      prisma.investigation.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
        include: {
          fir: {
            select: {
              firNumber: true,
            },
          },
          investigator: {
            select: {
              fullName: true,
            },
          },
        },
      }),

      prisma.fIR.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),
    ]);

    res.json({
      todaysCrimes,
      pendingFirs,
      mostWanted,
      recentInvestigations,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ======================================================
// Crime Trends
// ======================================================

dashboardRouter.get("/crime-trends", async (req, res, next) => {
  try {
    const months = parseInt(
      (req.query.months as string) || "6",
      10
    );

    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const crimes = await prisma.crime.findMany({
      where: {
        occurredAt: {
          gte: since,
        },
      },
      select: {
        occurredAt: true,
      },
    });

    const byMonth: Record<string, number> = {};

    for (const c of crimes) {
      const key = `${c.occurredAt.getFullYear()}-${String(
        c.occurredAt.getMonth() + 1
      ).padStart(2, "0")}`;

      byMonth[key] = (byMonth[key] || 0) + 1;
    }

    res.json(
      Object.entries(byMonth)
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([month, count]) => ({
          month,
          count,
        }))
    );
  } catch (err) {
    next(err);
  }
});

// ======================================================
// AI DASHBOARD INSIGHTS
// ======================================================

dashboardRouter.get("/ai-insights", async (_req, res, next) => {
  try {
    const districtStats = await prisma.crime.groupBy({
      by: ["districtId"],
      _count: true,
      orderBy: {
        _count: {
          districtId: "desc",
        },
      },
      take: 1,
    });

    let highestCrimeDistrict = "N/A";

    if (districtStats.length) {
      const district = await prisma.district.findUnique({
        where: {
          id: districtStats[0].districtId,
        },
      });

      highestCrimeDistrict = district?.name ?? "Unknown";
    }

    const openFirs = await prisma.fIR.count({
      where: {
        status: "OPEN",
      },
    });

    const highRiskCriminals = await prisma.accused.count({
      where: {
        riskScore: {
          gte: 80,
        },
      },
    });

    res.json({
      highestCrimeDistrict,
      openFirs,
      highRiskCriminals,
      summary: `${highestCrimeDistrict} currently records the highest crime activity. ${openFirs} FIRs remain open while ${highRiskCriminals} accused are classified as high risk.`,
    });
  } catch (err) {
    next(err);
  }
});