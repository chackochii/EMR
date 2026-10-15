import mongoose from 'mongoose';

/** Generic named sequence used for atomic auto-increment ids (e.g. patient ids). */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);
