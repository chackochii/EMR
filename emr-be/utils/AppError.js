/** Operational error carrying an HTTP status and optional field errors. */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode]
   * @param {{field: string, message: string}[]} [errors]
   */
  constructor(message, statusCode = 500, errors) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
