import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";

export const networkRouter = Router();
networkRouter.use(requireAuth);

/**
 * GET /api/network/:entityType/:entityId
 * Returns a graph (nodes + edges) rooted at the given entity, suitable
 * for React Flow. Walks one hop of Relationship rows in both directions,
 * then hydrates each node with a friendly label.
 */
networkRouter.get("/:entityType/:entityId", async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;

    const relationships = await prisma.relationship.findMany({
      where: {
        OR: [
          { sourceType: entityType, sourceId: entityId },
          { targetType: entityType, targetId: entityId },
        ],
      },
    });

    const nodeIds = new Set<string>([`${entityType}:${entityId}`]);
    for (const r of relationships) {
      nodeIds.add(`${r.sourceType}:${r.sourceId}`);
      nodeIds.add(`${r.targetType}:${r.targetId}`);
    }

    // Hydrate accused/victim labels where possible.
    const accusedIds = [...nodeIds].filter((n) => n.startsWith("accused:")).map((n) => n.split(":")[1]);
    const victimIds = [...nodeIds].filter((n) => n.startsWith("victim:")).map((n) => n.split(":")[1]);

    const [accusedList, victimList] = await Promise.all([
      accusedIds.length ? prisma.accused.findMany({ where: { id: { in: accusedIds } } }) : [],
      victimIds.length ? prisma.victim.findMany({ where: { id: { in: victimIds } } }) : [],
    ]);
    const accusedMap = new Map(accusedList.map((a) => [a.id, a]));
    const victimMap = new Map(victimList.map((v) => [v.id, v]));

    const nodes = [...nodeIds].map((key) => {
      const [type, id] = key.split(":");
      let label = `${type} ${id.slice(0, 6)}`;
      if (type === "accused" && accusedMap.has(id)) label = accusedMap.get(id)!.fullName;
      if (type === "victim" && victimMap.has(id)) label = victimMap.get(id)!.fullName;
      return { id: key, type, label, isRoot: key === `${entityType}:${entityId}` };
    });

    const edges = relationships.map((r) => ({
      id: r.id,
      source: `${r.sourceType}:${r.sourceId}`,
      target: `${r.targetType}:${r.targetId}`,
      relationType: r.relationType,
      strength: r.strength,
    }));

    res.json({ nodes, edges });
  } catch (err) {
    next(err);
  }
});

networkRouter.post("/relationships", auditLog("Relationship"), async (req, res, next) => {
  try {
    const rel = await prisma.relationship.create({ data: req.body });
    res.status(201).json(rel);
  } catch (err) {
    next(err);
  }
});
