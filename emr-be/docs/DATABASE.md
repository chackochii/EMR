# Database Design

MongoDB via Mongoose. Database: `emr_appointments`. IDs are ObjectIds (serialised as strings, field `id`).

## Relationships (ASCII)

```
 Department 1 ───────< Doctor >─────── 1 User (role=doctor)
     │                   │
     │ (derived)         │ 1
     │                   │
     └──────<  Appointment  >──────── N:1 Patient
                  │  createdBy / cancelledBy
                  └──────────────── N:1 User

 User 1───< RefreshToken        User 0..1───< AuditLog        Counter (name -> seq)
```

- `Doctor.user` -> `User` (unique, 1:1) and `Doctor.department` -> `Department`.
- `Appointment.{patient, doctor, department}` reference their collections; `department` is copied from the doctor at booking time.
- `Appointment.createdBy` / `cancelledBy` -> `User`.
- Slots are not persisted (generated from `Doctor` schedule + `Appointment`).

## Collections

### users
| Field | Type | Notes |
| --- | --- | --- |
| name, email, mobile | String | email lower-cased, unique |
| passwordHash | String | bcrypt, `select:false` |
| role | enum | `super_admin` / `receptionist` / `doctor` |
| isActive | Boolean | default true |
| createdAt/updatedAt | Date | |

Indexes: `{email:1}` unique, `{role:1, createdAt:-1}`.

```json
{ "_id": "665f...01", "name": "Dr. Arjun Mehta", "email": "doctor1@emr.com", "role": "doctor", "isActive": true }
```

### departments
`name`, `nameLower`. Index: `{nameLower:1}` unique.

### doctors
| Field | Type | Notes |
| --- | --- | --- |
| user | ObjectId -> users | unique |
| department | ObjectId -> departments | |
| name, nameLower | String | denormalised from user |
| specialization | String | |
| slotDuration | Number 5-120 | minutes, default 15 |
| workingDays | `[{dayOfWeek 0-6, sessions:[{start,end}]}]` | 0 = Sunday |
| breaks | `[{start,end,label?}]` | applied to every working day |
| isActive | Boolean | |

Indexes: `{user:1}` unique, `{department:1, nameLower:1}`, `{nameLower:1}`.

```json
{
  "_id": "665f...10", "user": "665f...01", "department": "665f...05",
  "name": "Dr. Arjun Mehta", "nameLower": "dr. arjun mehta", "specialization": "Cardiologist",
  "slotDuration": 15,
  "workingDays": [{ "dayOfWeek": 1, "sessions": [{ "start": "09:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }] }],
  "breaks": [{ "start": "12:00", "end": "13:00", "label": "Lunch" }]
}
```

### patients
`patientId` (`PT-000001`), `name`, `nameLower`, `mobile`, `gender`, `dateOfBirth` (`YYYY-MM-DD`)?, `age`?, `email`?, `address`?.

Indexes: `{patientId:1}` unique, `{mobile:1, nameLower:1}`, `{nameLower:1}`.

```json
{ "_id": "665f...20", "patientId": "PT-000001", "name": "Asha Raman", "nameLower": "asha raman", "mobile": "9000000001", "gender": "female", "age": 34 }
```

### counters
`{ _id: "patient", seq: 42 }` - incremented with `$inc` (atomic) to produce patient ids.

### appointments
| Field | Type | Notes |
| --- | --- | --- |
| patient, doctor, department | ObjectId | |
| date | String `YYYY-MM-DD` | clinic-local calendar day |
| startTime, endTime | String `HH:mm` | |
| status | enum | `scheduled`, `arrived`, `completed`, `cancelled` |
| purpose, notes | String | |
| arrivedAt, completedAt, cancelledAt | Date | |
| cancelledBy, createdBy | ObjectId -> users | |
| cancelReason | String | |

Indexes:
- `{doctor:1,date:1,startTime:1}` **unique, partial** (`status in [scheduled, arrived, completed]`) - name `uniq_active_slot`
- `{doctor:1,date:1,status:1}`
- `{department:1,date:1}`
- `{patient:1,createdAt:-1}`
- `{status:1,date:1}`
- `{date:1}`

```json
{
  "_id": "665f...30", "patient": "665f...20", "doctor": "665f...10", "department": "665f...05",
  "date": "2030-01-07", "startTime": "09:00", "endTime": "09:15", "status": "scheduled",
  "purpose": "Chest pain follow-up", "notes": "", "createdBy": "665f...02", "createdAt": "2030-01-01T08:00:00Z"
}
```

### audit_logs
`user?`, `role?`, `action` (enum), `entity`, `entityId`, `metadata` (mixed), `ip`, `createdAt` (no `updatedAt`).
Indexes: `{createdAt:-1}`, `{user:1,createdAt:-1}`, `{action:1,createdAt:-1}`.

```json
{ "action": "APPOINTMENT_CREATED", "user": "665f...02", "role": "receptionist", "entity": "Appointment", "entityId": "665f...30",
  "metadata": { "doctorId": "665f...10", "date": "2030-01-07", "startTime": "09:00" }, "ip": "::1" }
```

### refresh_tokens
`user`, `tokenHash` (SHA-256 of the refresh JWT), `expiresAt`, `revokedAt?`, `createdAt`.
Indexes: `{tokenHash:1}` unique, `{expiresAt:1}` TTL (`expireAfterSeconds: 0`), `{user:1}`.

```json
{ "user": "665f...01", "tokenHash": "9b74c9897bac770ffc029102a200c5de...", "expiresAt": "2030-01-08T08:00:00Z" }
```

## Notes

- Revoked refresh tokens are kept until `expiresAt` so reuse can be detected; the TTL index then removes them.
- Changing a doctor's schedule does not move existing appointments; they remain valid records.
