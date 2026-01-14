import prisma from "./prisma";

/**
 * Log an audit event
 * @param {Object} params
 * @param {string} params.actorId - User ID performing the action
 * @param {string} params.entity - Entity type (e.g., "order", "invoice", "payment")
 * @param {string} params.entityId - ID of the entity
 * @param {string} params.action - Action performed (e.g., "created", "updated", "verified")
 */
export async function logAudit({ actorId, entity, entityId, action }) {
  try {
    await prisma.auditLog.create({
      data: {
        entity,
        entityId,
        action,
        actorId: actorId || null,
      },
    });
  } catch (error) {
    console.error("Audit log failed:", error);
    // Don't throw - audit logging should not break the main flow
  }
}

