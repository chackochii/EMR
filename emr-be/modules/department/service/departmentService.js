import { AppError } from '../../../utils/AppError.js';
import { Department } from '../model/Department.js';

const toDTO = (d) => ({ id: String(d._id), name: d.name });

export async function listDepartments() {
  const departments = await Department.find().select('name').sort({ name: 1 }).lean();
  return departments.map(toDTO);
}

export async function createDepartment({ name }) {
  try {
    return toDTO(await Department.create({ name }));
  } catch (err) {
    if (err.code === 11000) throw new AppError('Department already exists', 409);
    throw err;
  }
}
