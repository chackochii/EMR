import { forwardRef, useId } from 'react';
import Field from '../Field';
import { describedBy } from '../../utils/a11y';

const Input = forwardRef(function Input({ label, error, hint, required, id, className = '', adornment, ...rest }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  const control = (
    <input
      ref={ref}
      id={inputId}
      className={`input ${adornment ? 'input--with-adornment' : ''} ${className}`.trim()}
      aria-invalid={error ? 'true' : undefined}
      aria-required={required || undefined}
      aria-describedby={describedBy(inputId, error, hint)}
      {...rest}
    />
  );
  return (
    <Field id={inputId} label={label} required={required} error={error} hint={hint}>
      {adornment ? (
        <div className="input-wrap">
          {control}
          <span className="input-wrap__adornment">{adornment}</span>
        </div>
      ) : (
        control
      )}
    </Field>
  );
});

export default Input;
