import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    nameLower: { type: String, required: true },
  },
  { timestamps: true },
);

departmentSchema.pre('validate', function setNameLower(next) {
  if (this.name) this.nameLower = this.name.trim().toLowerCase();
  next();
});

departmentSchema.index({ nameLower: 1 }, { unique: true });

export const Department = mongoose.model('Department', departmentSchema);
