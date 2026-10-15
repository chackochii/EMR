/** Label + control slot + hint/error text; shared by Input, Select, Textarea and DatePicker. */
export default function Field({ id, label, required, error, hint, children, className = '' }) {
  return (
    <div className={`field ${error ? 'field--invalid' : ''} ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="field__label">
          {label}
          {required && (
            <span className="field__required" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
