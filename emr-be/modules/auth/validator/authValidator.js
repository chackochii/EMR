import { z } from 'zod';

export const loginBody = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(200),
  })
  .strict();

export const refreshBody = z.object({ refreshToken: z.string().min(1).max(2000) }).strict();
