/** Builds the actor context passed from controllers to services (auth + audit info). */
export const getActor = (req) => ({
  id: req.user.id,
  role: req.user.role,
  doctorId: req.user.doctorId,
  ip: req.ip,
});
