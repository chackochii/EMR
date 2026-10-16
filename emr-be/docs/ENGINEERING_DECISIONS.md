# Engineering Decisions

## 1. Architecture

**Layered, module-per-domain Express app (ESM).** Each domain lives in `modules/<name>/{controller,service,model,validator}`.

| Layer | Responsibility |
| --- | --- |
| `routes/` | URL -> middleware chain -> controller. Auth, RBAC and validation are declared here, so the permission model is readable in one place. |
| `middleware/` | Cross-cutting: JWT validation, `requireRole`, zod `validate` (params/query/body), rate limit, sanitize, central error handler. |
| `modules/*/controller` | Thin: read validated input, call a service, wrap with `ok()`/`created()`. No business rules. |
| `modules/*/service` | **All business logic**: slot rules, status workflow, double-booking handling, audit, socket emits. |
| `modules/*/model` | Mongoose schemas + indexes. |
| `utils/` | Pure helpers (`slotGenerator`, `time`, constants, response/pagination). The slot generator is pure and unit-tested. |
| `sockets/` | Socket.IO bootstrap (JWT handshake) and emit helpers. |

Other decisions:

- **Stateless access tokens** (JWT, 15 min) carry `{sub, role, doctorId}`, so authorisation needs no DB hit per request. Trade-off: a deactivated user keeps access for up to 15 minutes; refresh checks `isActive`.
- **One serializer** (`appointmentDto.js`) is used by list, create, update and socket payloads, so the REST and real-time shapes can not drift.
- **Uniform envelope** `{success, message, data, meta?}` / `{success:false, message, errors?}` produced by `apiResponse.js` and `errorHandler.js` only.
- **Config is validated at boot** with zod (`config/env.js`); the process refuses to start with missing secrets, or in production without a clinic time zone (`TZ`). Containers default to UTC, which would make "past slot" and "today" checks wrong by the clinic's UTC offset, and Node silently treats an unknown or wrongly-cased `TZ` as UTC, so boot also verifies that the process clock matches the zone's wall-clock time (summer and winter).
- `createApp()` is separate from `server.js` so tests can mount the app without listening on a fixed port.

## 2. Schema design

- **Doctor is a separate collection from User** (`Doctor.user` unique). Auth data and clinical scheduling data have different lifecycles; appointments reference `Doctor._id`. The access token carries `doctorId` so doctor-scoped queries need no lookup.
- **Schedule is embedded in Doctor** (`slotDuration`, `workingDays[{dayOfWeek, sessions[]}]`, `breaks[]`). It is always read together with the doctor, is small and bounded, and is replaced atomically on `PUT`.
- **Slots are NOT stored.** They are generated on demand from the schedule and merged with the day's appointments. Storing slots would mean materialising millions of rows, and rewriting them every time a schedule changes. The only persisted fact is "this doctor/date/start is taken", which is the appointment itself.
- **`date` is a `YYYY-MM-DD` string and `startTime`/`endTime` are `HH:mm` strings.** An appointment is a wall-clock event in the clinic's timezone; strings avoid UTC/DST shifts, sort correctly lexicographically, compare cheaply in range queries and make the unique index trivial. Real instants (`arrivedAt`, `cancelledAt`, audit time) are `Date`.
- **Department is denormalised onto Appointment** (derived from the doctor at booking) to serve `{department, date}` filters and dashboards without joining.
- **Doctor `name` / `nameLower` are denormalised from User** (names are immutable in this module) so doctor lists and name search need no join.
- **Patient has `nameLower`** for case-insensitive *prefix* search that can use an index (a case-insensitive regex can not).
- **Patient ids** (`PT-000001`) come from a `counters` collection updated with atomic `$inc`, so concurrent creates never collide or need a read-modify-write.
- **Cancellation is a soft state** (`status: cancelled` + `cancelledAt/By/Reason`), preserving history and audit.
- **Refresh tokens** are stored only as SHA-256 hashes in their own collection with a TTL index.

See [DATABASE.md](./DATABASE.md) for collections, indexes and sample documents.

## 3. Double-booking prevention

The database, not application code, is the authority:

```js
appointmentSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['scheduled', 'arrived', 'completed'] } } },
);
```

- Two concurrent requests for the same slot both pass validation, but only one insert can satisfy the unique index; the other fails with `E11000`, which the service maps to **409 "Slot already booked"**. This is race-free with no locks, no transactions and works on a standalone mongod.
- The index is **partial**: cancelled appointments are excluded, so cancelling frees the slot and it can be re-booked, while history is kept.
- An early `exists` check returns 409 for the common non-racing case so we normally do not even create a patient.
- **Orphan patient handling.** A booking with `newPatient` must create the patient before the appointment (the appointment needs its id). Without a replica set there are no multi-document transactions, so the order is: validate slot -> early conflict check -> find-or-create patient -> insert appointment. If the insert fails and *this request* created the patient, the patient is deleted (compensation), unless some appointment already references it (another concurrent request reused it). The integration test fires 6 parallel bookings for one slot: exactly one `201`, five `409`, and exactly one patient remains.
- **Status transitions** use `findOneAndUpdate({_id, status: <expected>}, ...)`, so two concurrent "arrive"/"cancel" calls can not both succeed; the loser gets 409.
- Transition rules live in one map (`STATUS_TRANSITIONS` in `utils/constants.js`): `scheduled -> arrived | cancelled`, `arrived -> completed`; `completed` and `cancelled` are terminal.

**Assumptions:** "arrived" is only allowed on the appointment's own date (today); cancel is only allowed from `scheduled`. A new patient whose *exact* mobile **and** name (case-insensitive) already exist is reused; any other combination creates a new patient (families commonly share a phone number).

## 4. Indexes and why

| Collection | Index | Why |
| --- | --- | --- |
| users | `{email:1}` unique | login lookup, uniqueness |
| users | `{role:1, createdAt:-1}` | `GET /users?role=` |
| doctors | `{user:1}` unique | 1:1 with user, login -> doctorId |
| doctors | `{department:1, nameLower:1}` | department filter + ordered list |
| patients | `{patientId:1}` unique | exact/prefix id search, uniqueness |
| patients | `{mobile:1, nameLower:1}` | mobile prefix search; exact mobile+name reuse check |
| patients | `{nameLower:1}` | anchored name-prefix search |
| appointments | `{doctor,date,startTime}` unique partial | **double-booking guard**; also serves slot lookup (`doctor+date`) |
| appointments | `{doctor,date,status}` | doctor's day/status listings & dashboard |
| appointments | `{department,date}` | department filtered lists |
| appointments | `{patient,createdAt:-1}` | patient history; doctor->patient access check |
| appointments | `{status,date}` | status filter + date range |
| appointments | `{date}` | date range / sort by date |
| audit_logs | `{createdAt:-1}`, `{user,createdAt:-1}`, `{action,createdAt:-1}` | newest-first listing and filters |
| refresh_tokens | `{tokenHash:1}` unique | O(1) lookup/rotation |
| refresh_tokens | `{expiresAt:1}` TTL(0) | Mongo deletes expired tokens automatically |
| refresh_tokens | `{user:1}` | revoke-all on reuse |
| departments | `{nameLower:1}` unique | case-insensitive uniqueness |

All regex searches are **anchored prefix** regexes (`^term`) on lower-cased or normalised fields so they use index bounds, and user input is regex-escaped.

## 5. Security measures

- **Authentication:** bcrypt (cost 12, configurable) with constant-time compare against a dummy hash for unknown emails (no user enumeration by timing); identical error for wrong email/password/inactive user.
- **Tokens:** short-lived access JWT (15 m); refresh JWT (7 d) with a random `jti`, **rotated on every use**, stored only as a SHA-256 hash; **reuse of a revoked token revokes all of that user's tokens**; logout revokes the token; TTL index purges expired rows. Separate secrets for access and refresh.
- **Authorisation:** RBAC on every route (`requireRole`) plus object-level checks in services (doctors only see own slots/appointments/patients with an appointment).
- **Input validation:** zod on params, query and body; body schemas are `.strict()` (unknown keys rejected -> 422), query values are coerced/whitelisted (sort fields, enums), dates/times validated as real values.
- **NoSQL injection:** `sanitize` strips `$`-prefixed / dotted keys, zod rejects objects where strings are expected, and regex input is escaped.
- **HTTP hardening:** `helmet`, CORS restricted to `CORS_ORIGINS` (REST and Socket.IO), 100 kb body limit, `x-powered-by` disabled, `trust proxy` configurable.
- **Abuse protection:** global rate limit plus a stricter login limiter that counts only failed attempts (429).
- **No leakage:** password hashes are `select:false` and never serialised; refresh tokens are never stored raw; the error handler returns generic messages for unexpected errors and never sends stack traces; Mongo duplicate/cast/JWT errors map to 409/400/401.
- **Auditing:** login/logout/failed login, user creation, schedule and appointment changes are recorded (fire-and-forget; failures are logged, never surfaced).
- **Sockets:** JWT verified in the `io.use` handshake; doctors can only subscribe to their own room.
- **Operations:** secrets from env (validated at boot), `.env` git-ignored, container runs as non-root.

## 6. Performance optimisations (and why)

- **Lean queries + field projection** everywhere on read paths: skips Mongoose document hydration (2-5x less CPU/memory on lists).
- **List endpoint = 1 find + 1 count in parallel**; text searches (patient/doctor/mobile) are first resolved to a bounded `_id` list through indexed prefix queries (limit 500) and then applied as `$in`, instead of `$lookup`/regex across populated fields. Populate is selective (`patientId name mobile gender`, etc.), batched by Mongoose into 3 `$in` queries.
- **Slots: 1 query per request.** The day's appointments (`doctor+date`, only `startTime` selected) are merged with an in-memory generated list; the doctor's schedule is fetched in parallel. No slot documents exist.
- **Dashboard:** one `$facet` aggregation scans the (index-assisted, doctor-scoped) set once for total/today/upcoming/byStatus/todayByDoctor instead of 5+ round trips.
- **Pagination everywhere** with a hard `limit` cap, deterministic sort with `_id` tiebreaker, sort fields whitelisted to indexed ones.
- **Atomic counters and atomic updates** instead of read-modify-write (no extra round trips, no races).
- **Compression** (gzip) and small DTOs; denormalised `department` / doctor `name` avoid joins.
- **Audit is fire-and-forget** so it adds no latency to requests.
- **Stateless JWT auth** avoids a DB hit per request.
- **Socket fan-out by room:** only clients viewing a doctor's schedule receive that doctor's events.
- **Indexes are built at startup** (`Model.init()`), so the unique slot index exists before traffic is accepted.

## 7. What changes for millions of appointments

- **Sharding:** shard `appointments` on `{doctor: 1, date: 1}` (or a hashed doctor + date range). Slot reads and the unique slot index stay single-shard because the unique key is prefixed by the shard key. Department/dashboards become scatter-gather, so serve them from pre-aggregated counters.
- **Archiving / tiering:** move appointments older than N months (completed/cancelled) to a cold collection or object storage; the hot set stays small and the indexes stay in RAM. Alternatively time-partition by month.
- **Read replicas:** route list/report/dashboard reads to secondaries (`readPreference: secondaryPreferred`); keep booking and transitions on the primary. Slot availability reads that must be strictly fresh stay on the primary, because the unique index is the final safeguard anyway.
- **Cache:** Redis cache for generated slot grids / schedules (key `doctor:date`, invalidated on booking, cancel and schedule change) and dashboard counters with short TTLs. Cache `doctors`/`departments` lists.
- **Socket.IO:** use the Redis adapter (`@socket.io/redis-adapter`) so events reach clients on any node, with sticky sessions or WebSocket-only transport behind the load balancer.
- **Queue for audit logs:** push audit events to Kafka/SQS/BullMQ and write in batches by a worker; consider a write-optimised store (time-series/ClickHouse) with TTL.
- **Search:** move patient search to Atlas Search / Elasticsearch for infix, fuzzy and phonetic matching; keep Mongo prefix search as fallback.
- **Pagination:** switch deep lists from `skip/limit` to keyset (cursor) pagination on `{date, startTime, _id}` and avoid exact `countDocuments` on huge filters (estimated counts or capped counts).
- **Transactions:** with a replica set, wrap "create patient + appointment" in a transaction and drop the compensation step.
- **Operational:** stateless API behind a load balancer (horizontal scale), connection pool tuning, rate limiting in Redis (shared store), observability (metrics/tracing), per-tenant keys if multi-clinic.

## Real-time approach

Socket.IO shares the HTTP server and the CORS allow-list. The client connects with `io(url, { auth: { token: accessToken } })`; an `io.use` middleware verifies the JWT (same verifier as REST), so unauthenticated sockets never connect.

- Rooms: `doctor:<doctorId>` (one per doctor) and `all-appointments`. Receptionists and super admins auto-join `all-appointments`; doctors auto-join their own doctor room.
- Clients may emit `scheduler:subscribe {doctorId}` / `scheduler:unsubscribe {doctorId}` (with an optional ack `{ok, message?}`) to join/leave a doctor's room, e.g. when the scheduler view changes doctor. Doctors can only subscribe to themselves.
- After a successful DB write, services emit `appointment:created`, `appointment:updated` (edit, arrive, complete) or `appointment:cancelled` with `{ appointment: <DTO> }` to the doctor's room and `all-appointments` (a socket in both rooms receives it once).
- Emits happen **only after the DB operation succeeds**, from the service layer (so every code path, not just HTTP controllers, publishes consistently). If no Socket.IO server is initialised (unit tests), emits are no-ops.
- Events are hints plus the full DTO; clients can patch local state directly and refetch slots if they want strict consistency.
