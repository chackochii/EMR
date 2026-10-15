import { logger } from '../../../config/logger.js';
import { buildMeta, skipFor } from '../../../utils/pagination.js';
import { AuditLog } from '../model/AuditLog.js';

/**
 * Fire-and-forget audit entry. Never throws and is never awaited by callers,
 * so an audit failure can not break the user's request.
 * `actor: null` marks system operations (e.g. the seeder), which are not audited.
 * @param {{action:string, actor?:{id?:string,role?:string,ip?:string}|null, entity?:string, entityId?:string, metadata?:object}} entry
 */
export function log({ action, actor, entity, entityId, metadata }) {
  if (actor === null) return;
  AuditLog.create({
    action,
    user: actor?.id,
    role: actor?.role,
    ip: actor?.ip,
    entity,
    entityId: entityId ? String(entityId) : undefined,
    metadata,
  }).catch((err) => logger.warn({ err, action }, 'Failed to write audit log'));
}

const toDTO = (l) => ({
  id: String(l._id),
  user: l.user ? { id: String(l.user._id), name: l.user.name, email: l.user.email } : null,
  role: l.role ?? null,
  action: l.action,
  entity: l.entity ?? null,
  entityId: l.entityId ?? null,
  metadata: l.metadata ?? null,
  ip: l.ip ?? null,
  createdAt: l.createdAt,
});

export async function listAuditLogs({ action, user, dateFrom, dateTo, page, limit }) {
  const filter = {};
  if (action) filter.action = action;
  if (user) filter.user = user;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(`${dateFrom}T00:00:00`);
    if (dateTo) filter.createdAt.$lte = new Date(`${dateTo}T23:59:59.999`);
  }

  const [rows, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skipFor(page, limit))
      .limit(limit)
      .populate('user', 'name email')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  return { items: rows.map(toDTO), meta: buildMeta(page, limit, total) };
}
