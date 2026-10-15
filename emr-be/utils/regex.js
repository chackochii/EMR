/** Escapes user input so it can be embedded safely in a RegExp / $regex. */
export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
