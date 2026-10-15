import { z } from 'zod';

export const createDepartmentBody = z.object({ name: z.string().trim().min(2).max(100) }).strict();
