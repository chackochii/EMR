import { forwardRef, useId } from 'react';
import Field from '../Field';
import { describedBy } from '../../utils/a11y';

/** `options` is [{ value, label }]; `placeholder` renders an empty first option. */
const Select = forwardRef(function Select(
  { label, error, hint, required, id, options = [], placeholder, className = '', children, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <Field id={selectId} label={label} required={required} error={error} hint={hint}>
      <select
        ref={ref}
        id={selectId}
        className={`input select ${className}`.trim()}
        aria-invalid={error ? 'true' : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy(selectId, error, hint)}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    </Field>
  );
});

export default Select;
