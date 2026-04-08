import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { entity, action, actorId, requestId, limit = "100" } = req.query;
  const take = Math.min(parseInt(limit, 10) || 100, 500);

  const where = {};
  if (entity) where.entity = entity;
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (actorId) where.actorId = actorId;
  if (requestId) where.requestId = String(requestId);

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
  });

  const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean))];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));

  const withActor = logs.map((log) => ({
    id: log.id,
    entity: log.entity,
    entityId: log.entityId,
    action: log.action,
    actorId: log.actorId,
    actor: log.actorId ? actorMap[log.actorId] : null,
    requestId: log.requestId || null,
    ip: log.ip || null,
    userAgent: log.userAgent || null,
    metadata: log.metadata || null,
    createdAt: log.createdAt,
  }));

  return res.status(200).json(withActor);
}

export default requireAuth(requireRole(["ADMIN", "FINANCE"], handler));
