const send = (res, status, message, data, meta) => {
  const body = { success: true, message, data: data ?? null };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

export const ok = (res, data, message = 'Success', meta) => send(res, 200, message, data, meta);
export const created = (res, data, message = 'Created successfully') => send(res, 201, message, data);
