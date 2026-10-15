import { forwardRef, useId } from 'react';
import Field from '../Field';
import { describedBy } from '../../utils/a11y';

const Textarea = forwardRef(function Textarea(
  { label, error, hint, required, id, rows = 3, className = '', ...rest },
  ref,
) {
  const autoId = useId();
  const textareaId = id || autoId;
  return (
    <Field id={textareaId} label={label} required={required} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`input textarea ${className}`.trim()}
        aria-invalid={error ? 'true' : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy(textareaId, error, hint)}
        {...rest}
      />
    </Field>
  );
});

export default Textarea;
