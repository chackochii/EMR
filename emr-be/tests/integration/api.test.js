import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { io as connectSocket } from 'socket.io-client';

/* End-to-end API test against an in-memory MongoDB. Run with `npm run test:integration`. */

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.RATE_LIMIT_LOGIN_MAX = '5';
process.env.RATE_LIMIT_MAX = '100000';

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
/** First Monday (Mon-Sat is a working day) at least 7 days ahead. */
const nextMonday = () => {
  const d = daysFromNow(7);
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7));
  return fmt(d);
};
const nextSunday = () => {
  const d = daysFromNow(7);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return fmt(d);
};

describe('EMR API', () => {
  let mongod;
  let server;
  let base;
  let models;
  let disconnect;
  const tokens = {};
  const sockets = [];
  const MONDAY = nextMonday();

  const api = async (method, path, { token, body } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };
  const login = async (email, password) => (await api('POST', '/auth/login', { body: { email, password } })).body.data;

  const patientBody = (name, mobile) => ({ name, mobile, gender: 'female', age: 30 });
  const book = (token, doctorId, startTime, extra = {}) =>
    api('POST', '/appointments', {
      token,
      body: { doctorId, date: MONDAY, startTime, purpose: 'Checkup', newPatient: patientBody('Test Patient', '9000000001'), ...extra },
    });

  before(async () => {
    mongod = await MongoMemoryServer.create();
    const { connectDB, disconnectDB } = await import('../../config/db.js');
    disconnect = disconnectDB;
    await connectDB(mongod.getUri('emr_test'));
    const { runSeed } = await import('../../seeders/seed.js');
    await runSeed();

    const { createApp } = await import('../../app.js');
    const { initSocket } = await import('../../sockets/socket.js');
    server = http.createServer(createApp());
    initSocket(server);
    await new Promise((resolve) => server.listen(0, resolve));
    base = `http://127.0.0.1:${server.address().port}/api/v1`;

    models = {
      Appointment: (await import('../../modules/appointment/model/Appointment.js')).Appointment,
      Patient: (await import('../../modules/patient/model/Patient.js')).Patient,
    };

    tokens.admin = (await login('admin@emr.com', 'Admin@123')).accessToken;
    tokens.reception = (await login('reception@emr.com', 'Recep@123')).accessToken;
    const doc1 = await login('doctor1@emr.com', 'Doctor@123');
    tokens.doctor1 = doc1.accessToken;
    tokens.doctor1Id = doc1.user.doctorId;
    const doc2 = await login('doctor2@emr.com', 'Doctor@123');
    tokens.doctor2 = doc2.accessToken;
    tokens.doctor2Id = doc2.user.doctorId;
  });

  after(async () => {
    sockets.forEach((s) => s.close());
    await new Promise((resolve) => server.close(resolve));
    await disconnect();
    await mongod.stop();
  });

  describe('auth', () => {
    it('rejects bad credentials with 401 and no details', async () => {
      const res = await api('POST', '/auth/login', { body: { email: 'admin@emr.com', password: 'wrong' } });
      assert.equal(res.status, 401);
      assert.deepEqual(res.body, { success: false, message: 'Invalid email or password' });
    });

    it('returns 422 with field errors for invalid / operator-injection input', async () => {
      const res = await api('POST', '/auth/login', { body: { email: { $ne: null }, password: 'x' } });
      assert.equal(res.status, 422);
      assert.equal(res.body.success, false);
      assert.ok(res.body.errors[0].field);
    });

    it('logs in and never leaks password data', async () => {
      const res = await api('POST', '/auth/login', { body: { email: 'doctor1@emr.com', password: 'Doctor@123' } });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.role, 'doctor');
      assert.ok(res.body.data.user.doctorId);
      assert.ok(!JSON.stringify(res.body).toLowerCase().includes('passwordhash'));
    });

    it('requires a token and rejects garbage tokens', async () => {
      assert.equal((await api('GET', '/auth/me')).status, 401);
      assert.equal((await api('GET', '/auth/me', { token: 'abc' })).status, 401);
      const me = await api('GET', '/auth/me', { token: tokens.admin });
      assert.equal(me.body.data.user.email, 'admin@emr.com');
    });

    it('rotates refresh tokens and revokes everything on reuse', async () => {
      const first = await login('reception@emr.com', 'Recep@123');
      const rotated = await api('POST', '/auth/refresh', { body: { refreshToken: first.refreshToken } });
      assert.equal(rotated.status, 200);
      assert.notEqual(rotated.body.data.refreshToken, first.refreshToken);

      const reuse = await api('POST', '/auth/refresh', { body: { refreshToken: first.refreshToken } });
      assert.equal(reuse.status, 401);
      const afterReuse = await api('POST', '/auth/refresh', { body: { refreshToken: rotated.body.data.refreshToken } });
      assert.equal(afterReuse.status, 401, 'reuse must revoke the whole token family');
    });

    it('logout invalidates the refresh token', async () => {
      const session = await login('reception@emr.com', 'Recep@123');
      const out = await api('POST', '/auth/logout', { token: session.accessToken, body: { refreshToken: session.refreshToken } });
      assert.equal(out.status, 200);
      const res = await api('POST', '/auth/refresh', { body: { refreshToken: session.refreshToken } });
      assert.equal(res.status, 401);
    });
  });

  describe('users, departments, doctors', () => {
    it('only super_admin can create users; duplicates give 409', async () => {
      const body = { name: 'Second Desk', email: 'desk2@emr.com', password: 'Desk@1234', role: 'receptionist' };
      assert.equal((await api('POST', '/users', { token: tokens.reception, body })).status, 403);
      const created = await api('POST', '/users', { token: tokens.admin, body });
      assert.equal(created.status, 201);
      assert.equal(created.body.data.email, 'desk2@emr.com');
      assert.equal((await api('POST', '/users', { token: tokens.admin, body })).status, 409);
    });

    it('requires departmentId for doctors and creates a doctor profile', async () => {
      const body = { name: 'Dr. New', email: 'new.doc@emr.com', password: 'Doctor@123', role: 'doctor' };
      assert.equal((await api('POST', '/users', { token: tokens.admin, body })).status, 422);
      const departments = (await api('GET', '/departments', { token: tokens.admin })).body.data;
      assert.equal(departments.length, 4);
      const res = await api('POST', '/users', { token: tokens.admin, body: { ...body, departmentId: departments[0].id } });
      assert.equal(res.status, 201);
      assert.ok(res.body.data.doctorId);
      const list = await api('GET', '/users?role=doctor&limit=2', { token: tokens.admin });
      assert.equal(list.body.meta.limit, 2);
      assert.equal(list.body.meta.total, 5);
    });

    it('lists doctors by role scope', async () => {
      const all = await api('GET', '/doctors', { token: tokens.reception });
      assert.ok(all.body.data.length >= 4);
      const first = all.body.data.find((d) => d.id === tokens.doctor1Id);
      assert.equal(first.hasSchedule, true);
      assert.equal(first.department.name, 'Cardiology');
      assert.equal(first.departmentId, first.department.id);

      const own = await api('GET', '/doctors', { token: tokens.doctor1 });
      assert.deepEqual(own.body.data.map((d) => d.id), [tokens.doctor1Id]);

      const search = await api('GET', '/doctors?search=priya', { token: tokens.admin });
      assert.equal(search.body.data.length, 1);
    });

    it('validates and saves schedules (super_admin only)', async () => {
      const path = `/doctors/${tokens.doctor2Id}/schedule`;
      const current = await api('GET', path, { token: tokens.reception });
      assert.equal(current.body.data.slotDuration, 30);
      assert.equal(current.body.data.workingDays.length, 6);

      const overlapping = {
        slotDuration: 30,
        workingDays: [{ dayOfWeek: 1, sessions: [{ start: '09:00', end: '12:00' }, { start: '11:00', end: '13:00' }] }],
        breaks: [],
      };
      assert.equal((await api('PUT', path, { token: tokens.admin, body: overlapping })).status, 422);
      assert.equal((await api('PUT', path, { token: tokens.reception, body: current.body.data })).status, 403);

      const { doctorId, ...schedule } = current.body.data;
      const saved = await api('PUT', path, { token: tokens.admin, body: schedule });
      assert.equal(saved.status, 200);
      assert.equal(saved.body.data.doctorId, doctorId);
      assert.equal((await api('GET', path, { token: tokens.doctor1 })).status, 403);
    });
  });

  describe('slots', () => {
    it('generates slots without breaks and flags non-working days', async () => {
      const res = await api('GET', `/slots?doctorId=${tokens.doctor1Id}&date=${MONDAY}`, { token: tokens.reception });
      assert.equal(res.status, 200);
      const { slots, isWorkingDay, slotDuration } = res.body.data;
      assert.equal(isWorkingDay, true);
      assert.equal(slotDuration, 15);
      assert.equal(slots.length, 12 + 16);
      assert.ok(!slots.some((s) => s.startTime >= '12:00' && s.startTime < '13:00'));
      assert.ok(slots.every((s) => s.status === 'available'));

      const sunday = await api('GET', `/slots?doctorId=${tokens.doctor1Id}&date=${nextSunday()}`, { token: tokens.reception });
      assert.equal(sunday.body.data.isWorkingDay, false);
      assert.deepEqual(sunday.body.data.slots, []);
    });

    it('marks every slot of a past day as past and restricts doctors to themselves', async () => {
      const res = await api('GET', `/slots?doctorId=${tokens.doctor1Id}&date=${fmt(daysFromNow(-7))}`, { token: tokens.admin });
      assert.ok(res.body.data.slots.every((s) => s.status === 'past'));
      const other = await api('GET', `/slots?doctorId=${tokens.doctor2Id}&date=${MONDAY}`, { token: tokens.doctor1 });
      assert.equal(other.status, 403);
      assert.equal((await api('GET', '/slots?doctorId=bad&date=nope', { token: tokens.admin })).status, 422);
    });
  });

  describe('booking', () => {
    let first;

    it('books an appointment and returns the full DTO', async () => {
      const res = await book(tokens.reception, tokens.doctor1Id, '09:00');
      assert.equal(res.status, 201);
      first = res.body.data;
      assert.equal(first.status, 'scheduled');
      assert.equal(first.endTime, '09:15');
      assert.equal(first.date, MONDAY);
      assert.match(first.patient.patientId, /^PT-\d{6}$/);
      assert.equal(first.department.name, 'Cardiology');
      assert.equal(first.doctor.id, tokens.doctor1Id);

      const slots = await api('GET', `/slots?doctorId=${tokens.doctor1Id}&date=${MONDAY}`, { token: tokens.admin });
      const slot = slots.body.data.slots.find((s) => s.startTime === '09:00');
      assert.equal(slot.status, 'booked');
      assert.equal(slot.appointmentId, first.id);
    });

    it('rejects the same slot with 409 and invalid slots with 422', async () => {
      const taken = await book(tokens.reception, tokens.doctor1Id, '09:00');
      assert.equal(taken.status, 409);
      assert.equal(taken.body.message, 'Slot already booked');
      assert.equal((await book(tokens.reception, tokens.doctor1Id, '12:00')).status, 422, 'break');
      assert.equal((await book(tokens.reception, tokens.doctor1Id, '09:07')).status, 422, 'misaligned');
      assert.equal((await book(tokens.reception, tokens.doctor1Id, '09:30', { date: nextSunday() })).status, 422, 'off day');
      assert.equal((await book(tokens.reception, tokens.doctor1Id, '09:30', { date: fmt(daysFromNow(-7)) })).status, 422, 'past');
      assert.equal((await book(tokens.doctor1, tokens.doctor1Id, '09:30')).status, 403, 'doctors cannot book');
      assert.equal((await book(tokens.reception, tokens.doctor1Id, '09:30', { patientId: 'PT-000001' })).status, 422, 'patientId XOR newPatient');
    });

    it('reuses a patient on exact mobile + name match', async () => {
      const second = await book(tokens.reception, tokens.doctor1Id, '09:15');
      assert.equal(second.status, 201);
      assert.equal(second.body.data.patient.id, first.patient.id);
    });

    it('books with an existing patient id (human readable or Mongo id)', async () => {
      const byCode = await book(tokens.reception, tokens.doctor1Id, '09:30', { newPatient: undefined, patientId: first.patient.patientId });
      assert.equal(byCode.status, 201);
      assert.equal(byCode.body.data.patient.id, first.patient.id);
      const byId = await book(tokens.reception, tokens.doctor1Id, '09:45', { newPatient: undefined, patientId: first.patient.id });
      assert.equal(byId.status, 201);
      assert.equal((await book(tokens.reception, tokens.doctor1Id, '10:00', { newPatient: undefined, patientId: 'PT-999999' })).status, 404);
    });

    it('allows exactly one winner under concurrent double booking and leaves no orphan patients', async () => {
      const attempts = Array.from({ length: 6 }, (_, i) =>
        book(tokens.reception, tokens.doctor1Id, '10:15', { newPatient: patientBody(`Racer ${i}`, `91000000${pad(i)}`) }),
      );
      const results = await Promise.all(attempts);
      const statuses = results.map((r) => r.status).sort();
      assert.deepEqual(statuses, [201, 409, 409, 409, 409, 409]);
      const racers = await models.Patient.countDocuments({ name: /^Racer/ });
      assert.equal(racers, 1, 'patients created for failed bookings must be cleaned up');
    });

    it('frees the slot when cancelled and allows re-booking', async () => {
      const res = await book(tokens.reception, tokens.doctor1Id, '10:30');
      const id = res.body.data.id;
      const cancel = await api('DELETE', `/appointments/${id}`, { token: tokens.reception, body: { reason: 'Patient request' } });
      assert.equal(cancel.status, 200);
      assert.equal(cancel.body.data.status, 'cancelled');
      assert.equal(cancel.body.data.cancelReason, 'Patient request');
      assert.ok(cancel.body.data.cancelledAt);

      assert.equal((await api('DELETE', `/appointments/${id}`, { token: tokens.reception })).status, 409);
      assert.equal((await api('PUT', `/appointments/${id}`, { token: tokens.reception, body: { notes: 'x' } })).status, 409);
      assert.equal((await book(tokens.reception, tokens.doctor1Id, '10:30')).status, 201);
    });
  });

  describe('lifecycle', () => {
    let apptId;

    it('only allows arrival on the appointment date', async () => {
      const future = (await book(tokens.reception, tokens.doctor1Id, '14:00')).body.data;
      const res = await api('POST', `/appointments/${future.id}/arrive`, { token: tokens.reception });
      assert.equal(res.status, 409);
    });

    it('arrive -> doctor notes -> complete, with workflow and permission checks', async () => {
      const today = fmt(new Date());
      const patient = await models.Patient.findOne({ name: 'Test Patient' }).lean();
      const doc = await models.Appointment.create({
        patient: patient._id,
        doctor: tokens.doctor2Id,
        department: (await models.Appointment.findOne({ doctor: tokens.doctor1Id }).lean()).department,
        date: today,
        startTime: '09:00',
        endTime: '09:30',
        purpose: 'Follow up',
      });
      apptId = String(doc._id);

      assert.equal((await api('POST', `/appointments/${apptId}/arrive`, { token: tokens.doctor2 })).status, 403);
      const arrived = await api('POST', `/appointments/${apptId}/arrive`, { token: tokens.reception });
      assert.equal(arrived.status, 200);
      assert.equal(arrived.body.data.status, 'arrived');
      assert.ok(arrived.body.data.arrivedAt);
      assert.equal((await api('POST', `/appointments/${apptId}/arrive`, { token: tokens.reception })).status, 409);
      assert.equal((await api('DELETE', `/appointments/${apptId}`, { token: tokens.reception })).status, 409, 'arrived cannot be cancelled');

      assert.equal((await api('PUT', `/appointments/${apptId}`, { token: tokens.doctor1, body: { notes: 'n' } })).status, 403, 'other doctor');
      assert.equal((await api('PUT', `/appointments/${apptId}`, { token: tokens.doctor2, body: { purpose: 'x' } })).status, 403);
      assert.equal((await api('PUT', `/appointments/${apptId}`, { token: tokens.reception, body: { status: 'completed' } })).status, 403);

      const edited = await api('PUT', `/appointments/${apptId}`, { token: tokens.reception, body: { purpose: 'Follow up visit' } });
      assert.equal(edited.body.data.purpose, 'Follow up visit');

      const done = await api('PUT', `/appointments/${apptId}`, { token: tokens.doctor2, body: { status: 'completed', notes: 'All good' } });
      assert.equal(done.status, 200);
      assert.equal(done.body.data.status, 'completed');
      assert.equal(done.body.data.notes, 'All good');

      assert.equal((await api('PUT', `/appointments/${apptId}`, { token: tokens.reception, body: { purpose: 'late' } })).status, 409);
      const lateNotes = await api('PUT', `/appointments/${apptId}`, { token: tokens.doctor2, body: { notes: 'Addendum' } });
      assert.equal(lateNotes.body.data.notes, 'Addendum');
      assert.equal((await api('PUT', `/appointments/${apptId}`, { token: tokens.doctor2, body: {} })).status, 422);
    });
  });

  describe('listing, patients, dashboard, audit', () => {
    it('paginates, sorts and filters appointments', async () => {
      const page = await api('GET', '/appointments?page=1&limit=2&sortBy=startTime&sortOrder=asc', { token: tokens.reception });
      assert.equal(page.status, 200);
      assert.equal(page.body.data.length, 2);
      assert.equal(page.body.meta.limit, 2);
      assert.equal(page.body.meta.totalPages, Math.ceil(page.body.meta.total / 2));
      assert.ok(page.body.data[0].startTime <= page.body.data[1].startTime);

      const byStatus = await api('GET', '/appointments?status=cancelled', { token: tokens.admin });
      assert.ok(byStatus.body.data.length >= 1 && byStatus.body.data.every((a) => a.status === 'cancelled'));

      const byPatient = await api('GET', '/appointments?patient=test%20pat', { token: tokens.admin });
      assert.ok(byPatient.body.data.length >= 1);
      const byCode = await api('GET', `/appointments?patient=${byPatient.body.data[0].patient.patientId}`, { token: tokens.admin });
      assert.ok(byCode.body.data.length >= 1);
      assert.equal((await api('GET', '/appointments?mobile=9000000001', { token: tokens.admin })).body.data.length >= 1, true);

      const byDoctor = await api('GET', '/appointments?doctor=arjun&departmentId=' + byPatient.body.data[0].department.id, { token: tokens.admin });
      assert.ok(byDoctor.body.data.every((a) => a.doctor.id === tokens.doctor1Id));

      const none = await api('GET', '/appointments?patient=zzzz-nobody', { token: tokens.admin });
      assert.deepEqual(none.body.data, []);
      assert.equal(none.body.meta.total, 0);

      const range = await api('GET', `/appointments?dateFrom=${MONDAY}&dateTo=${MONDAY}`, { token: tokens.admin });
      assert.ok(range.body.data.every((a) => a.date === MONDAY));

      assert.equal((await api('GET', '/appointments?sortBy=passwordHash', { token: tokens.admin })).status, 422, 'sort whitelist');
      assert.equal((await api('GET', '/appointments?status[$ne]=x', { token: tokens.admin })).status, 422);
    });

    it('scopes doctors to their own appointments, ignoring a client doctorId', async () => {
      const res = await api('GET', `/appointments?limit=100&doctorId=${tokens.doctor1Id}`, { token: tokens.doctor2 });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length >= 1);
      assert.ok(res.body.data.every((a) => a.doctor.id === tokens.doctor2Id));
    });

    it('searches patients safely (prefix match, regex escaped) and enforces doctor access', async () => {
      const byName = await api('GET', '/patients?search=TEST', { token: tokens.reception });
      assert.equal(byName.body.data[0].name, 'Test Patient');
      assert.equal((await api('GET', '/patients?search=.*', { token: tokens.reception })).body.data.length, 0);
      assert.equal((await api('GET', '/patients?search=(', { token: tokens.reception })).status, 200);
      assert.equal((await api('GET', '/patients?search=900000', { token: tokens.reception })).body.data.length >= 1, true);
      assert.ok((await api('GET', '/patients?limit=1', { token: tokens.reception })).body.data.length <= 1);

      const created = await api('POST', '/patients', {
        token: tokens.reception,
        body: patientBody('Brand New', '+91 98765-43210'),
      });
      assert.equal(created.status, 201);
      assert.equal(created.body.data.mobile, '+919876543210');
      assert.equal((await api('POST', '/patients', { token: tokens.reception, body: { name: 'A', mobile: '1' } })).status, 422);

      const treated = byName.body.data[0].id;
      assert.equal((await api('GET', `/patients/${treated}`, { token: tokens.doctor1 })).status, 200);
      assert.equal((await api('GET', `/patients/${created.body.data.id}`, { token: tokens.doctor1 })).status, 403);
      assert.equal((await api('GET', `/patients/${'a'.repeat(24)}`, { token: tokens.admin })).status, 404);
    });

    it('returns dashboard stats scoped by role', async () => {
      const admin = await api('GET', '/dashboard/stats', { token: tokens.admin });
      const stats = admin.body.data;
      assert.ok(stats.total >= 6);
      assert.equal(Object.values(stats.byStatus).reduce((a, b) => a + b, 0), stats.total);
      assert.ok(stats.upcoming >= 1);
      assert.ok(Array.isArray(stats.todayByDoctor));
      assert.equal(stats.todayByDoctor.find((d) => d.doctorId === tokens.doctor2Id).count, 1);

      const doctor = await api('GET', '/dashboard/stats', { token: tokens.doctor2 });
      assert.equal(doctor.body.data.total, 1);
      assert.equal(doctor.body.data.todayByDoctor, undefined);
    });

    it('lists audit logs for super_admin only, with filters', async () => {
      await new Promise((resolve) => setTimeout(resolve, 200)); // audit writes are fire-and-forget
      assert.equal((await api('GET', '/audit-logs', { token: tokens.reception })).status, 403);
      const res = await api('GET', '/audit-logs?action=APPOINTMENT_CREATED&limit=5', { token: tokens.admin });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length > 0 && res.body.data.every((l) => l.action === 'APPOINTMENT_CREATED'));
      assert.ok(res.body.data[0].user.email);
      const failed = await api('GET', '/audit-logs?action=LOGIN_FAILED', { token: tokens.admin });
      assert.ok(failed.body.data.length >= 1);
    });

    it('returns the standard envelope for unknown routes', async () => {
      const res = await api('GET', '/nope');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });
  });

  describe('real-time events', () => {
    const connect = (token) =>
      new Promise((resolve, reject) => {
        const socket = connectSocket(base.replace('/api/v1', ''), { auth: { token }, transports: ['websocket'] });
        sockets.push(socket);
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', reject);
      });
    const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
    const emitAck = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

    it('rejects sockets without a valid token', async () => {
      await assert.rejects(connect('garbage'), /Unauthorized/);
    });

    it('enforces doctor-only-own subscriptions', async () => {
      const socket = await connect(tokens.doctor1);
      assert.equal((await emitAck(socket, 'scheduler:subscribe', { doctorId: tokens.doctor2Id })).ok, false);
      assert.equal((await emitAck(socket, 'scheduler:subscribe', { doctorId: tokens.doctor1Id })).ok, true);
      assert.equal((await emitAck(socket, 'scheduler:subscribe', { doctorId: 'bad' })).ok, false);
    });

    it('pushes created / updated / cancelled events after DB success', async () => {
      const staff = await connect(tokens.reception);
      const doctor = await connect(tokens.doctor1);
      assert.equal((await emitAck(staff, 'scheduler:subscribe', { doctorId: tokens.doctor1Id })).ok, true);

      const createdForDoctor = once(doctor, 'appointment:created');
      const createdForStaff = once(staff, 'appointment:created');
      const res = await book(tokens.reception, tokens.doctor1Id, '16:00');
      const [a, b] = await Promise.all([createdForDoctor, createdForStaff]);
      assert.equal(a.appointment.id, res.body.data.id);
      assert.equal(b.appointment.doctor.id, tokens.doctor1Id);

      const updated = once(doctor, 'appointment:updated');
      await api('PUT', `/appointments/${res.body.data.id}`, { token: tokens.reception, body: { notes: 'hello' } });
      assert.equal((await updated).appointment.notes, 'hello');

      const cancelled = once(doctor, 'appointment:cancelled');
      await api('DELETE', `/appointments/${res.body.data.id}`, { token: tokens.reception });
      assert.equal((await cancelled).appointment.status, 'cancelled');
    });
  });

  describe('rate limiting', () => {
    it('throttles repeated failed logins with 429', async () => {
      const statuses = [];
      for (let i = 0; i < 8; i += 1) {
        statuses.push((await api('POST', '/auth/login', { body: { email: 'admin@emr.com', password: 'nope' } })).status);
      }
      assert.ok(statuses.includes(429), `expected a 429 in ${statuses}`);
    });
  });
});
