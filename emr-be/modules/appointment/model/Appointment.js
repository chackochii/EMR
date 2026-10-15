import mongoose from 'mongoose';
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_VALUES,
  SLOT_HOLDING_STATUSES,
} from '../../../utils/constants.js';

const { ObjectId } = mongoose.Schema.Types;

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: ObjectId, ref: 'Patient', required: true },
    doctor: { type: ObjectId, ref: 'Doctor', required: true },
    department: { type: ObjectId, ref: 'Department', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (clinic-local calendar day)
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true },
    status: { type: String, enum: APPOINTMENT_STATUS_VALUES, default: APPOINTMENT_STATUS.SCHEDULED },
    purpose: { type: String, required: true, trim: true, maxlength: 500 },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    arrivedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelledBy: { type: ObjectId, ref: 'User' },
    cancelReason: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Double-booking guard: one live appointment per doctor/date/start. Cancelled rows are excluded.
appointmentSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: { $in: SLOT_HOLDING_STATUSES } }, name: 'uniq_active_slot' },
);
appointmentSchema.index({ doctor: 1, date: 1, status: 1 });
appointmentSchema.index({ department: 1, date: 1 });
appointmentSchema.index({ patient: 1, createdAt: -1 });
appointmentSchema.index({ status: 1, date: 1 });
appointmentSchema.index({ date: 1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
