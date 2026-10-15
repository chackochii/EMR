# API Reference

Base URL: `http://localhost:5000/api/v1`. All endpoints except `/auth/login`, `/auth/refresh` and `/health` need `Authorization: Bearer <accessToken>`.

Roles: `super_admin`, `receptionist`, `doctor`. Dates are `YYYY-MM-DD`, times `HH:mm` (24h, server local time).

## Response format

```json
{ "success": true, "message": "...", "data": {}, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
{ "success": false, "message": "Validation failed", "errors": [{ "field": "body.date", "message": "..." }] }
```

`errors[].field` is the dotted path inside the part that failed (e.g. `date`, `newPatient.mobile`).

| Status | Meaning |
| --- | --- |
| 200 / 201 | OK / created |
| 400 | Malformed JSON, invalid id cast |
| 401 | Missing/invalid/expired token, bad credentials |
| 403 | Role or ownership not allowed |
| 404 | Not found |
| 409 | Conflict: slot already booked, duplicate, invalid status transition |
| 422 | Validation failed (zod) or business validation (invalid slot, past slot) |
| 429 | Rate limited |
| 500 | Unexpected error (generic message) |

## Auth

### POST /auth/login (rate limited)
Request `{ "email": "admin@emr.com", "password": "Admin@123" }`
Response 200
```json
{ "success": true, "message": "Login successful", "data": {
  "user": { "id": "665f..", "name": "Super Admin", "email": "admin@emr.com", "role": "super_admin", "isActive": true },
  "accessToken": "eyJ...", "refreshToken": "eyJ..." } }
```
Doctors also have `user.doctorId`. 401 `Invalid email or password`; 429 after repeated failures.

### POST /auth/refresh
Request `{ "refreshToken": "eyJ..." }` -> 200 `data: { accessToken, refreshToken }`. The old refresh token is revoked. Presenting a revoked token returns 401 and revokes all of that user's tokens.

### POST /auth/logout (auth)
Request `{ "refreshToken": "eyJ..." }` -> 200 `data: null`.

### GET /auth/me (auth)
200 `data: { user: { id, name, email, role, doctorId? } }`

## Users (super_admin)

### POST /users
```json
{ "name": "Dr. Sam", "email": "sam@emr.com", "password": "Doctor@123", "role": "doctor",
  "mobile": "9876543210", "departmentId": "665f..", "specialization": "Neurologist" }
```
`departmentId` is required for `doctor`. 201 `data: { id, name, email, role, mobile, isActive, doctorId? }`. 409 duplicate email; 404 unknown department. Password: min 8 chars with a letter and a digit.

### GET /users?role=&page=1&limit=10
200 `data: [user...]`, `meta`.

## Departments

### GET /departments (any authenticated)
200 `data: [{ "id": "665f..", "name": "Cardiology" }]`

### POST /departments (super_admin)
Request `{ "name": "Neurology" }` -> 201 `data: { id, name }`; 409 if it exists (case-insensitive).

## Doctors

### GET /doctors?departmentId=&search=
super_admin/receptionist: all active doctors. doctor: only self. `search` is a case-insensitive name contains.
```json
{ "data": [{ "id": "665f..", "name": "Dr. Arjun Mehta", "email": "doctor1@emr.com", "specialization": "Cardiologist",
  "departmentId": "665f..", "department": { "id": "665f..", "name": "Cardiology" }, "slotDuration": 15, "hasSchedule": true }] }
```
`id` is the **Doctor** id (not the user id).

### GET /doctors/:id/schedule
doctor role: only own id (403 otherwise).
```json
{ "data": { "doctorId": "665f..", "slotDuration": 15,
  "workingDays": [{ "dayOfWeek": 1, "sessions": [{ "start": "09:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }] }],
  "breaks": [{ "start": "12:00", "end": "13:00", "label": "Lunch" }] } }
```

### PUT /doctors/:id/schedule (super_admin)
Body: same as `data` above without `doctorId`. Rules: `slotDuration` 5-120; `dayOfWeek` 0-6 (0 = Sunday) and unique; each session `start < end`, sessions within a day must not overlap and each must be at least `slotDuration` long; breaks `start < end`, applied to every working day. 422 with field errors otherwise. 200 returns the schedule.

## Slots

### GET /slots?doctorId=&date=YYYY-MM-DD
doctor role may only request own `doctorId` (403).
```json
{ "data": { "doctorId": "665f..", "date": "2030-01-07", "slotDuration": 15, "isWorkingDay": true,
  "slots": [
    { "startTime": "09:00", "endTime": "09:15", "session": "Morning", "sessionIndex": 0, "status": "booked", "appointmentId": "665f.." },
    { "startTime": "09:15", "endTime": "09:30", "session": "Morning", "sessionIndex": 0, "status": "available" } ] } }
```
`status` is `available | booked | past`. Break times are never listed. `session` is `Morning` (<12:00), `Afternoon` (<17:00) or `Evening` by session start; `sessionIndex` is the 0-based index of the session in that day.

## Patients (super_admin, receptionist; GET /:id also doctor)

### GET /patients?search=&limit=10
`search` matches patientId prefix, mobile prefix, or name prefix (case-insensitive). Max limit 50. No search -> most recent patients.
`data: [{ id, patientId, name, mobile, gender, dateOfBirth?, age?, email?, address? }]`

### POST /patients
```json
{ "name": "Asha Raman", "mobile": "9000000001", "gender": "female", "age": 34, "email": "asha@example.com", "address": "..." }
```
`gender`: male | female | other. Provide `age` and/or `dateOfBirth`. Mobile: spaces/dashes stripped, 7-15 digits, optional `+`. 201 returns the patient with `patientId: "PT-000001"`.

### GET /patients/:id
doctor role: only if the doctor has an appointment with the patient (403 otherwise).

## Appointments

Appointment object:
```json
{ "id": "665f..", "date": "2030-01-07", "startTime": "09:00", "endTime": "09:15", "status": "scheduled",
  "purpose": "Chest pain", "notes": "", "arrivedAt": null, "cancelledAt": null, "cancelReason": null,
  "createdAt": "2030-01-01T08:00:00.000Z",
  "patient": { "id": "..", "patientId": "PT-000001", "name": "Asha Raman", "mobile": "9000000001", "gender": "female" },
  "doctor": { "id": "..", "name": "Dr. Arjun Mehta", "specialization": "Cardiologist" },
  "department": { "id": "..", "name": "Cardiology" } }
```

### POST /appointments (receptionist, super_admin)
```json
{ "doctorId": "665f..", "date": "2030-01-07", "startTime": "09:00", "purpose": "Chest pain", "notes": "optional",
  "newPatient": { "name": "Asha Raman", "mobile": "9000000001", "gender": "female", "age": 34 } }
```
Exactly one of `patientId` (Mongo id **or** `PT-000001`) or `newPatient`. 201 -> appointment.
- 422: time is not a generated slot (break, off day, misaligned) or is in the past.
- 409 `Slot already booked`.
- 404: doctor or patient not found.
- An existing patient with the exact same mobile and name (case-insensitive) is reused; otherwise a new patient is created.

### GET /appointments
Query: `page=1&limit=10&sortBy=date|startTime|createdAt|status&sortOrder=asc|desc` (default `date desc`) and filters `patient` (name or patientId prefix), `doctor` (doctor name contains), `mobile` (prefix), `departmentId`, `doctorId`, `status`, `dateFrom`, `dateTo`.
Doctor role is always scoped to own appointments (client `doctorId` ignored). 200 `data: [appointment]`, `meta: { page, limit, total, totalPages }`.

### PUT /appointments/:id
Body (at least one): `{ "purpose"?, "notes"?, "status"?: "completed" }`
- receptionist/super_admin: `purpose`/`notes` while `scheduled` or `arrived`; `status` -> 403.
- doctor (own appointments only): `notes` (also after completion); `status: "completed"` only from `arrived`; `purpose` -> 403.
- cancelled is immutable (409); completed is immutable for staff (409).

### DELETE /appointments/:id (receptionist, super_admin)
Optional body `{ "reason": "..." }`. Soft cancel; only from `scheduled` (409 otherwise). Frees the slot. Returns the appointment with `status: "cancelled"`.

### POST /appointments/:id/arrive (receptionist, super_admin)
`scheduled -> arrived`, only on the appointment's date (409 otherwise). Sets `arrivedAt`.

Status workflow: `scheduled -> arrived -> completed`, `scheduled -> cancelled`. Anything else is 409 `Cannot change an appointment from 'x' to 'y'`.

## Dashboard

### GET /dashboard/stats (all roles; doctor scoped to self)
```json
{ "data": { "total": 120, "today": 14, "upcoming": 40,
  "byStatus": { "scheduled": 50, "arrived": 3, "completed": 60, "cancelled": 7 },
  "todayByDoctor": [{ "doctorId": "665f..", "name": "Dr. Arjun Mehta", "count": 6 }] } }
```
`today` = today's non-cancelled appointments; `upcoming` = `scheduled` appointments from now onward; `todayByDoctor` only for super_admin.

## Audit logs (super_admin)

### GET /audit-logs?action=&user=&dateFrom=&dateTo=&page=1&limit=10
```json
{ "data": [{ "id": "..", "user": { "id": "..", "name": "Front Desk", "email": "reception@emr.com" }, "role": "receptionist",
  "action": "APPOINTMENT_CREATED", "entity": "Appointment", "entityId": "..", "metadata": {}, "ip": "::1", "createdAt": "..." }],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 } }
```
Actions: LOGIN, LOGIN_FAILED, LOGOUT, USER_CREATED, SCHEDULE_UPDATED, APPOINTMENT_CREATED, APPOINTMENT_UPDATED, APPOINTMENT_CANCELLED, APPOINTMENT_ARRIVED, APPOINTMENT_COMPLETED.

## Health

`GET /health` -> `{ success: true, message: "OK", data: { uptime } }` (no auth).

## Socket.IO

Connect to the server root (`http://localhost:5000`) with `io(url, { auth: { token: accessToken } })`; invalid tokens fail with `connect_error: Unauthorized`.

| Direction | Event | Payload |
| --- | --- | --- |
| client -> server | `scheduler:subscribe` | `{ doctorId }` (ack `{ ok, message? }`) |
| client -> server | `scheduler:unsubscribe` | `{ doctorId }` |
| server -> client | `appointment:created` / `appointment:updated` / `appointment:cancelled` | `{ appointment: <appointment DTO> }` |

Receptionists and super admins automatically receive events for all doctors (`all-appointments`); doctors receive their own. Subscribing to other doctors as a doctor is rejected (`ok: false`).
