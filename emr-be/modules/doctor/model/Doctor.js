import mongoose from 'mongoose';

const timeRange = { start: { type: String, required: true }, end: { type: String, required: true } };

const workingDaySchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    sessions: { type: [new mongoose.Schema(timeRange, { _id: false })], default: [] },
  },
  { _id: false },
);

const breakSchema = new mongoose.Schema({ ...timeRange, label: { type: String, trim: true } }, { _id: false });

const doctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    // Denormalised from User (names are immutable in this module) so lists/searches need no join.
    name: { type: String, required: true, trim: true },
    nameLower: { type: String, required: true },
    specialization: { type: String, trim: true, default: '' },
    slotDuration: { type: Number, min: 5, max: 120, default: 15 },
    workingDays: { type: [workingDaySchema], default: [] },
    breaks: { type: [breakSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

doctorSchema.index({ user: 1 }, { unique: true });
doctorSchema.index({ department: 1, nameLower: 1 });
doctorSchema.index({ nameLower: 1 });

export const Doctor = mongoose.model('Doctor', doctorSchema);
