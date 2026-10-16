import 'dotenv/config';
import { z } from 'zod';

/**
 * True when the process clock really runs in `tz`. Node applies TZ itself but silently falls back to UTC
 * for names it does not recognise (e.g. wrong case), so compare wall-clock times, including across DST.
 */
const isAppliedTimeZone = (tz) => {
  try {
    const format = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', hour: 'numeric', minute: 'numeric' });
    const year = new Date().getFullYear();
    return [new Date(), new Date(year, 0, 15), new Date(year, 6, 15)].every((date) => {
      const parts = Object.fromEntries(format.formatToParts(date).map((p) => [p.type, Number(p.value)]));
      return parts.hour === date.getHours() && parts.minute === date.getMinutes();
    });
  } catch {
    return false;
  }
};

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(0).default(5000),
    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/emr_appointments'),
    JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
    JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    TRUST_PROXY: z.string().default('0'),
    BODY_LIMIT: z.string().default('100kb'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(600),
    RATE_LIMIT_LOGIN_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10),
    // Clinic time zone: "today" and past-slot checks use the process clock, so it must not silently be UTC.
    TZ: z
      .string()
      .refine(isAppliedTimeZone, 'Unknown time zone; use a case-sensitive IANA name such as Asia/Kolkata')
      .optional(),
  })
  .refine((e) => e.NODE_ENV !== 'production' || e.TZ, {
    message: 'TZ is required in production (the clinic time zone, e.g. Asia/Kolkata)',
    path: ['TZ'],
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

const raw = parsed.data;

const parseTrustProxy = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return /^\d+$/.test(value) ? Number(value) : value;
};

export const env = Object.freeze({
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  corsOrigins: raw.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  trustProxy: parseTrustProxy(raw.TRUST_PROXY),
});
