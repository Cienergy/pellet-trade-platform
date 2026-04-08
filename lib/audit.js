import prisma from "./prisma";

/**
 * Log an audit event
 * @param {Object} params
 * @param {string} params.actorId - User ID performing the action
 * @param {string} params.entity - Entity type (e.g., "order", "invoice", "payment")
 * @param {string} params.entityId - ID of the entity
 * @param {string} params.action - Action performed (e.g., "created", "updated", "verified")
 * @param {Object} [params.metadata] - Optional structured details (before/after, reason codes, etc.)
 * @param {Object} [params.req] - Optional Next.js request (for requestId/ip/userAgent)
 * @param {string} [params.requestId] - Optional request correlation id
 * @param {string} [params.ip] - Optional IP address
 * @param {string} [params.userAgent] - Optional user agent string
 */
export async function logAudit({ actorId, entity, entityId, action, metadata, req, requestId, ip, userAgent }) {
  try {
    const resolvedRequestId =
      requestId ||
      (req && req.requestId) ||
      (req && typeof req.headers?.["x-request-id"] === "string" ? req.headers["x-request-id"] : null) ||
      null;
    const resolvedUserAgent = userAgent || (req && req.headers && req.headers["user-agent"]) || null;
    const resolvedIp =
      ip ||
      (req && (req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress)) ||
      null;

    await prisma.auditLog.create({
      data: {
        entity,
        entityId,
        action,
        actorId: actorId || null,
        metadata: metadata ?? null,
        requestId: resolvedRequestId,
        ip: resolvedIp ? String(resolvedIp) : null,
        userAgent: resolvedUserAgent ? String(resolvedUserAgent) : null,
      },
    });
  } catch (error) {
    console.error("Audit log failed:", error);
    // Don't throw - audit logging should not break the main flow
  }
}

