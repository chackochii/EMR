import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    nameLower: { type: String, required: true },
    mobile: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    dateOfBirth: { type: String }, // YYYY-MM-DD
    age: { type: Number, min: 0, max: 150 },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true },
);

patientSchema.pre('validate', function setNameLower(next) {
  if (this.name) this.nameLower = this.name.trim().toLowerCase();
  next();
});

patientSchema.index({ patientId: 1 }, { unique: true });
patientSchema.index({ mobile: 1, nameLower: 1 });
patientSchema.index({ nameLower: 1 });

export const Patient = mongoose.model('Patient', patientSchema);
