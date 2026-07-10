import { PrismaClient, Role, FIRStatus, Gender } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const KARNATAKA_DISTRICTS = [
  "Bengaluru Urban",
  "Mysuru",
  "Mangaluru",
  "Belagavi",
  "Hubballi-Dharwad",
  "Kalaburagi",
  "Ballari",
  "Tumakuru",
  "Shivamogga",
  "Davanagere",
];

const CRIME_TYPES = [
  { name: "Theft", category: "Property", severity: 2, ipcSections: ["379"] },
  { name: "Burglary", category: "Property", severity: 3, ipcSections: ["457", "380"] },
  { name: "Robbery", category: "Property", severity: 4, ipcSections: ["392"] },
  { name: "Assault", category: "Violent", severity: 3, ipcSections: ["323", "324"] },
  { name: "Cybercrime - Financial Fraud", category: "Cyber", severity: 3, ipcSections: ["66D", "420"] },
  { name: "Homicide", category: "Violent", severity: 5, ipcSections: ["302"] },
  { name: "Kidnapping", category: "Violent", severity: 5, ipcSections: ["363"] },
  { name: "Narcotics", category: "Narcotics", severity: 4, ipcSections: ["NDPS Act"] },
  { name: "Extortion", category: "Property", severity: 3, ipcSections: ["384"] },
  { name: "Vehicle Theft", category: "Property", severity: 2, ipcSections: ["379"] },
];

const FIRST_NAMES = ["Arjun", "Priya", "Ravi", "Lakshmi", "Suresh", "Kavya", "Manjunath", "Deepa", "Naveen", "Anitha", "Ganesh", "Shwetha", "Vinay", "Divya", "Prakash"];
const LAST_NAMES = ["Gowda", "Rao", "Reddy", "Naik", "Shetty", "Kumar", "Hegde", "Patil", "Iyer", "Nayak"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName(): string {
  return `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`;
}

function randomDateWithinDays(days: number): Date {
  const now = Date.now();
  return new Date(now - Math.random() * days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding Crime Intelligence Platform database...");

  // --- Geography ---
  const karnataka = await prisma.state.upsert({
    where: { code: "KA" },
    update: {},
    create: { name: "Karnataka", code: "KA" },
  });

  const districts = [];
  for (const name of KARNATAKA_DISTRICTS) {
    const d = await prisma.district.upsert({
      where: { name_stateId: { name, stateId: karnataka.id } },
      update: {},
      create: { name, stateId: karnataka.id },
    });
    districts.push(d);
  }

  const policeStations = [];
  for (const d of districts) {
    for (let i = 1; i <= 3; i++) {
      const code = `${d.name.slice(0, 3).toUpperCase()}-PS-${i}`;
      const ps = await prisma.policeStation.upsert({
        where: { code },
        update: {},
        create: {
          name: `${d.name} Police Station ${i}`,
          code,
          districtId: d.id,
          latitude: 12.9 + Math.random() * 2,
          longitude: 75.5 + Math.random() * 3,
        },
      });
      policeStations.push(ps);
    }
  }

  // --- Crime types ---
  const crimeTypes = [];
  for (const ct of CRIME_TYPES) {
    const created = await prisma.crimeType.upsert({
      where: { name: ct.name },
      update: {},
      create: ct,
    });
    crimeTypes.push(created);
  }

  // --- Users (one per role, real bcrypt hashes) ---
  const defaultPassword = await bcrypt.hash("Passw0rd!23", 12);
  const roleSeeds: { role: Role; email: string; fullName: string; badge: string }[] = [
    { role: "ADMIN", email: "admin@ksp.gov.in", fullName: "S. Ramachandra (Admin)", badge: "KSP-ADM-001" },
    { role: "INVESTIGATOR", email: "investigator@ksp.gov.in", fullName: "Arjun Gowda", badge: "KSP-INV-001" },
    { role: "ANALYST", email: "analyst@ksp.gov.in", fullName: "Kavya Reddy", badge: "KSP-ANL-001" },
    { role: "SUPERVISOR", email: "supervisor@ksp.gov.in", fullName: "Suresh Naik", badge: "KSP-SUP-001" },
    { role: "POLICY_MAKER", email: "policy@ksp.gov.in", fullName: "Lakshmi Iyer", badge: "KSP-POL-001" },
  ];

  const users = [];
  for (const u of roleSeeds) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        fullName: u.fullName,
        badgeNumber: u.badge,
        passwordHash: defaultPassword,
        role: u.role,
        policeStationId: randomFrom(policeStations).id,
      },
    });
    users.push(user);
  }
  const investigator = users.find((u) => u.role === "INVESTIGATOR")!;

  // --- Pool of "recurring" accused, so criminals show up across multiple
  // FIRs (repeat offenders / gang activity) — this is what makes the
  // Network Analysis graph actually show connections instead of isolated
  // one-off nodes. ---
  const ACCUSED_POOL_SIZE = 35;
  const accusedPool = [];
  for (let i = 0; i < ACCUSED_POOL_SIZE; i++) {
    const highRisk = Math.random() > 0.7;
    const accused = await prisma.accused.create({
      data: {
        fullName: randomName(),
        aliases: Math.random() > 0.6 ? [randomName().split(" ")[0]] : [],
        gender: randomFrom<Gender>(["MALE", "FEMALE"]),
        age: 18 + Math.floor(Math.random() * 45),
        address: `${randomFrom(districts).name}`,
        riskScore: highRisk ? 60 + Math.round(Math.random() * 400) / 10 : Math.round(Math.random() * 500) / 10,
        behaviorProfile: highRisk
          ? "Prior history of violent offenses; flagged for repeat-offender monitoring."
          : "No prior recorded offenses.",
      },
    });
    accusedPool.push(accused);
  }

  // A pool of financial accounts (mixed formats) that recur across
  // transactions, so the money-trail graph has genuine shared nodes.
  const ACCOUNT_POOL_SIZE = 25;
  const accountPool = Array.from({ length: ACCOUNT_POOL_SIZE }, (_, i) =>
    `KA${String(1000 + i).padStart(6, "0")}XX${Math.floor(1000 + Math.random() * 8999)}`
  );

  // A handful of explicit "known associate" / organization relationships
  // between pool accused, layered on top of the FIR-derived connections.
  const ORG_IDS = ["org-lotus-network", "org-riverside-syndicate"];
  for (let i = 0; i < 18; i++) {
    const a = randomFrom(accusedPool);
    let b = randomFrom(accusedPool);
    while (b.id === a.id) b = randomFrom(accusedPool);
    await prisma.relationship.create({
      data: {
        sourceType: "accused",
        sourceId: a.id,
        targetType: "accused",
        targetId: b.id,
        relationType: "ASSOCIATE",
        strength: Math.round(Math.random() * 100) / 100,
        notes: "Identified as known associates through prior joint investigations.",
      },
    });
  }
  for (const accused of accusedPool.filter(() => Math.random() > 0.75)) {
    await prisma.relationship.create({
      data: {
        sourceType: "accused",
        sourceId: accused.id,
        targetType: "organization",
        targetId: randomFrom(ORG_IDS),
        relationType: "ORGANIZATION_MEMBER",
        strength: 0.8,
      },
    });
  }

  // --- FIRs, crimes, victims, accused, financial transactions ---
  const NUM_FIRS = 120;
  for (let i = 0; i < NUM_FIRS; i++) {
    const ps = randomFrom(policeStations);
    const crimeType = randomFrom(crimeTypes);
    const status = randomFrom<FIRStatus>(["OPEN", "UNDER_INVESTIGATION", "CHARGESHEET_FILED", "CLOSED"]);
    const filedAt = randomDateWithinDays(365);
    const firNumber = `FIR/${filedAt.getFullYear()}/${ps.code}/${1000 + i}`;

    const fir = await prisma.fIR.create({
      data: {
        firNumber,
        policeStationId: ps.id,
        status,
        summary: `${crimeType.name} reported in the jurisdiction of ${ps.name}. Preliminary report filed and initial inquiry initiated.`,
        filedAt,
        createdById: investigator.id,
      },
    });

    await prisma.crime.create({
      data: {
        firId: fir.id,
        crimeTypeId: crimeType.id,
        districtId: ps.districtId,
        occurredAt: filedAt,
        description: `${crimeType.name} incident under IPC section(s) ${crimeType.ipcSections.join(", ")}.`,
        latitude: 12.9 + Math.random() * 2,
        longitude: 75.5 + Math.random() * 3,
      },
    });

    // 1-2 victims per FIR (occasionally more, for group-victim incidents)
    const victimIds: string[] = [];
    const numVictims = Math.random() > 0.85 ? 2 : 1;
    for (let v = 0; v < numVictims; v++) {
      const victim = await prisma.victim.create({
        data: {
          fullName: randomName(),
          gender: randomFrom<Gender>(["MALE", "FEMALE"]),
          age: 18 + Math.floor(Math.random() * 55),
          address: `${ps.name} jurisdiction`,
          phone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
        },
      });
      victimIds.push(victim.id);
      await prisma.victimOnFIR.create({ data: { firId: fir.id, victimId: victim.id } });
    }

    // Accused: ~70% of FIRs have 1-3 accused, drawn mostly from the
    // recurring pool (repeat offenders) with an occasional one-off.
    const accusedIds: string[] = [];
    if (Math.random() > 0.3) {
      const numAccused = Math.random() > 0.8 ? (Math.random() > 0.5 ? 3 : 2) : 1;
      const chosen = new Set<string>();
      for (let a = 0; a < numAccused; a++) {
        const useRecurring = Math.random() > 0.25;
        let accused;
        if (useRecurring) {
          accused = randomFrom(accusedPool);
          if (chosen.has(accused.id)) continue;
        } else {
          accused = await prisma.accused.create({
            data: {
              fullName: randomName(),
              aliases: Math.random() > 0.7 ? [randomName().split(" ")[0]] : [],
              gender: randomFrom<Gender>(["MALE", "FEMALE"]),
              age: 18 + Math.floor(Math.random() * 45),
              address: `${randomFrom(districts).name}`,
              riskScore: Math.round(Math.random() * 500) / 10,
              behaviorProfile: "No prior recorded offenses.",
            },
          });
        }
        chosen.add(accused.id);
        accusedIds.push(accused.id);
        await prisma.accusedOnFIR.create({ data: { firId: fir.id, accusedId: accused.id } });
      }
    }

    // --- Relationship records for the Network Analysis graph ---
    // CHARGED_IN: every accused named in this FIR <-> the FIR itself.
    // REPORTED_IN: every victim named in this FIR <-> the FIR itself.
    // INVOLVED_IN: every accused <-> every victim on the same FIR (the
    // direct connection an investigator cares about — who is accused of
    // harming whom). Together these guarantee that any accused or victim
    // pulled up in Network Analysis resolves to a connected graph, not
    // just an isolated root node.
    for (const accusedId of accusedIds) {
      await prisma.relationship.create({
        data: {
          sourceType: "accused",
          sourceId: accusedId,
          targetType: "fir",
          targetId: fir.id,
          relationType: "CHARGED_IN",
          strength: 1,
          notes: `Named as accused in ${fir.firNumber}.`,
        },
      });
    }
    for (const victimId of victimIds) {
      await prisma.relationship.create({
        data: {
          sourceType: "victim",
          sourceId: victimId,
          targetType: "fir",
          targetId: fir.id,
          relationType: "REPORTED_IN",
          strength: 1,
          notes: `Named as victim in ${fir.firNumber}.`,
        },
      });
    }
    for (const accusedId of accusedIds) {
      for (const victimId of victimIds) {
        await prisma.relationship.create({
          data: {
            sourceType: "accused",
            sourceId: accusedId,
            targetType: "victim",
            targetId: victimId,
            relationType: "INVOLVED_IN",
            strength: 1,
            notes: `Accused and victim linked through ${fir.firNumber}.`,
          },
        });
      }
    }

    // Financial transactions: ~25% of FIRs (weighted toward financial-fraud
    // and extortion cases) carry a short money trail.
    const isFinanciallyRelevant = ["Cybercrime - Financial Fraud", "Extortion", "Robbery"].includes(crimeType.name);
    if (Math.random() < (isFinanciallyRelevant ? 0.6 : 0.12)) {
      const numTx = 1 + Math.floor(Math.random() * 2);
      for (let t = 0; t < numTx; t++) {
        const fromAccount = randomFrom(accountPool);
        let toAccount = randomFrom(accountPool);
        while (toAccount === fromAccount) toAccount = randomFrom(accountPool);
        const flagged = Math.random() > 0.6;
        await prisma.financialTransaction.create({
          data: {
            firId: fir.id,
            fromAccount,
            toAccount,
            amount: Math.round((1000 + Math.random() * 495000) * 100) / 100,
            currency: "INR",
            transactedAt: filedAt,
            flagged,
            flagReason: flagged ? "Rapid transfer pattern inconsistent with declared income." : null,
          },
        });
      }
    }

    if (status !== "OPEN") {
      await prisma.investigation.create({
        data: {
          firId: fir.id,
          investigatorId: investigator.id,
          stage: status === "CLOSED" ? "Closed" : "Evidence Review",
          notes: "Investigation proceeding per standard operating procedure.",
        },
      });
    }
  }

  console.log(`Seed complete: ${districts.length} districts, ${policeStations.length} stations, ${NUM_FIRS} FIRs.`);
  console.log("Demo login: admin@ksp.gov.in / investigator@ksp.gov.in / analyst@ksp.gov.in (password: Passw0rd!23)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
