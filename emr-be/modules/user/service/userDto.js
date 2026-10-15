/** Safe public view of a user (never includes the password hash). */
export const toUserDTO = (user, doctorId) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  mobile: user.mobile,
  isActive: user.isActive,
  doctorId: doctorId ? String(doctorId) : undefined,
});
