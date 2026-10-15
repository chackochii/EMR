import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ok } from '../../../utils/apiResponse.js';
import { listAuditLogs } from '../service/auditService.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await listAuditLogs(req.query);
  ok(res, items, 'Audit logs fetched', meta);
});
