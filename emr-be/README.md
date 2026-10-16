# emr-be - EMR Appointment Management API

Backend for the Enterprise EMR appointment module: authentication with RBAC (super admin, receptionist, doctor), doctor schedules, dynamically generated slots, race-free appointment booking, status workflow, dashboard, audit log and real-time updates.

Stack: Node.js 20+ (ESM), Express 4, MongoDB/Mongoose 8, Zod, Socket.IO, JWT, bcryptjs, helmet, cors, express-rate-limit, pino, compression.

Docs: [API](docs/API.md) | [Database](docs/DATABASE.md) | [Engineering decisions](docs/ENGINEERING_DECISIONS.md)

## Folder structure

```
emr-be/
  server.js            # http server + Socket.IO + graceful shutdown
  app.js               # express app factory (middleware + routes)
  config/              # env (zod-validated), db, cors, logger
  middleware/          # tokenValidator, requireRole, validate, sanitize, rateLimit, errorHandler, notFound
  modules/
    auth user department doctor slot patient appointment audit dashboard
      controller/ service/ model/ validator/     # business logic lives in service/
  routes/              # /api/v1 router + one file per module
  sockets/             # socket.js (JWT handshake, rooms), appointmentEvents.js (emit helpers)
  seeders/seed.js      # idempotent seed
  utils/               # apiResponse, AppError, asyncHandler, pagination, time, slotGenerator, constants, ...
  tests/               # unit (node:test) + integration (in-memory MongoDB)
  docs/
```

## Architecture

Route -> middleware (auth, RBAC, zod validation) -> thin controller -> service (all business rules, audit, socket emits) -> Mongoose model. One response envelope and one centralized error handler. See [ENGINEERING_DECISIONS.md](docs/ENGINEERING_DECISIONS.md).

## Database design summary

Collections: `users`, `departments`, `doctors` (embedded schedule), `patients`, `counters`, `appointments`, `audit_logs`, `refresh_tokens`. Slots are generated on demand, never stored. Double booking is prevented by a unique partial index on `{doctor, date, startTime}` for active statuses. Details and indexes: [DATABASE.md](docs/DATABASE.md).

## API summary

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me` |
| Users | `POST /users`, `GET /users` (super_admin) |
| Departments | `GET /departments`, `POST /departments` |
| Doctors | `GET /doctors`, `GET/PUT /doctors/:id/schedule` |
| Slots | `GET /slots?doctorId=&date=` |
| Patients | `GET/POST /patients`, `GET /patients/:id` |
| Appointments | `POST/GET /appointments`, `PUT/DELETE /appointments/:id`, `POST /appointments/:id/arrive` |
| Dashboard | `GET /dashboard/stats` |
| Audit | `GET /audit-logs` (super_admin) |
| Real-time | Socket.IO events `appointment:created|updated|cancelled`, `scheduler:subscribe|unsubscribe` |

Full request/response examples: [API.md](docs/API.md).

## Environment variables

See `.env.example` (a local `.env` with dev-only secrets is git-ignored).

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | development | |
| `PORT` | 5000 | |
| `MONGODB_URI` | mongodb://127.0.0.1:27017/emr_appointments | |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | required (min 16 chars) | use long random values in production |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | 15m, 7d | |
| `BCRYPT_SALT_ROUNDS` | 12 | |
| `CORS_ORIGINS` | http://localhost:5173 | comma separated; REST + Socket.IO |
| `LOG_LEVEL` | info | |
| `TRUST_PROXY` | 0 | number of proxies in front of the API |
| `BODY_LIMIT` | 100kb | |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | 15 min, 600 | global limiter |
| `RATE_LIMIT_LOGIN_WINDOW_MS`, `RATE_LIMIT_LOGIN_MAX` | 15 min, 10 | failed-login limiter |
| `TZ` | host time zone; **required in production** | clinic time zone (IANA, case-sensitive, e.g. `Asia/Kolkata`); decides "today" and past slots. An unknown name is rejected at boot instead of silently becoming UTC |

## Install and run

```bash
npm install
cp .env.example .env          # already provided for local dev
npm run seed                  # needs a running MongoDB
npm run dev                   # node --watch server.js   (or: npm start)
```

Docker: `JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... docker compose up --build` (API on :5000, MongoDB on :27017), then `docker compose exec api node seeders/seed.js`. The API container uses `TZ=Asia/Kolkata` unless you pass another `TZ`.

Tests:

```bash
npm test                      # unit: slot generation, schedule validation, status workflow
npm run test:integration      # full API + sockets against mongodb-memory-server (downloads a mongod binary on first run)
```

## Seeded credentials

| Role | Email | Password |
| --- | --- | --- |
| Super admin | admin@emr.com | Admin@123 |
| Receptionist | reception@emr.com | Recep@123 |
| Doctors | doctor1@emr.com ... doctor4@emr.com | Doctor@123 |

Departments: Cardiology, Orthopedics, Pediatrics, General Medicine. Doctors work Mon-Sat, 09:00-12:00 and 13:00-17:00, lunch break 12:00-13:00, slots of 15 min (doctor1, doctor3) or 30 min (doctor2, doctor4). The seed is idempotent and does not overwrite existing records.

## Assumptions

- Timezone: dates/times are clinic-local wall-clock values; "past" and "today" use the clinic time zone set by `TZ` (one time zone per deployment).
- Doctor identity everywhere is `Doctor._id`; the login response and token carry `doctorId` for doctor users.
- A new patient is reused only on exact mobile + name (case-insensitive) match; otherwise a new patient is created.
- Arrival can only be marked on the appointment date; cancellation only from `scheduled`.
- Doctors can add notes (even after completion) and complete only `arrived` appointments of their own.
- Patient search matches prefixes (id, mobile, name), not arbitrary substrings.
- `session` in slots is a label (`Morning`/`Afternoon`/`Evening`) derived from the session start; `sessionIndex` is also returned.

## Known limitations

- Changing a schedule does not re-validate or move already-booked appointments.
- Access tokens are stateless: a deactivated user stays valid until the access token expires (<= 15 min).
- No multi-document transactions (standalone MongoDB assumed); patient+appointment creation uses compensation instead.
- Patient/doctor text filters in the appointment list resolve to at most 500 ids.
- Concurrent refresh calls with the same refresh token are treated as reuse and revoke the session.
- No user update/deactivate endpoints, no rescheduling, no email/SMS notifications.
- Rate limiting is in-memory (per instance).

## Future improvements

Rescheduling, user management (deactivate/reset password), multi-clinic tenancy and timezones, Redis (slot cache, shared rate limit, Socket.IO adapter), queued audit logging, keyset pagination, Atlas/Elastic search, OpenAPI spec, CI pipeline. See the scaling section in the engineering decisions doc.
