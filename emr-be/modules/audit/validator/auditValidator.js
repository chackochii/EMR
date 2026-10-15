import { z } from 'zod';
import { AUDIT_ACTION_VALUES } from '../../../utils/constants.js';
import { dateString, objectId, paginationQuery } from '../../../utils/validation.js';

export const listAuditLogsQuery = z.object({
  ...paginationQuery,
  action: z.enum(AUDIT_ACTION_VALUES).optional(),
  user: objectId.optional(),
  dateFrom: dateString.optional(),
  dateTo: dateString.optional(),
});
