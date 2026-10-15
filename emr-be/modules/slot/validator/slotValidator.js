import { z } from 'zod';
import { dateString, objectId } from '../../../utils/validation.js';

export const slotsQuery = z.object({ doctorId: objectId, date: dateString });
