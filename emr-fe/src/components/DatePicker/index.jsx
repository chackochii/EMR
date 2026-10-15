import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Field from '../Field';
import Icon from '../Icon';
import { describedBy } from '../../utils/a11y';
import Calendar from './Calendar';
import { formatDate, todayISO } from '../../utils/date';

export default function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  error,
  hint,
  required,
  clearable = false,
  placeholder = 'Select date',
  id,
  disabled = false,
}) {
  const autoId = useId();
  const triggerId = id || autoId;
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const handleSelect = (iso) => {
    onChange(iso);
    close();
  };

  return (
    <Field id={triggerId} label={label} required={required} error={error} hint={hint}>
      <div
        className="datepicker"
        ref={rootRef}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            close();
          }
        }}
      >
        <button
          type="button"
          id={triggerId}
          ref={triggerRef}
          className="input datepicker__trigger"
          onClick={() => setOpen((prev) => !prev)}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(triggerId, error, hint)}
        >
          <span className={value ? '' : 'datepicker__placeholder'}>{value ? formatDate(value) : placeholder}</span>
          <Icon name="calendar" size={16} className="datepicker__icon" />
        </button>
        {clearable && value && !disabled && (
          <button type="button" className="datepicker__clear" onClick={() => onChange('')} aria-label="Clear date">
            <Icon name="x" size={14} />
          </button>
        )}
        {open && (
          <div className="datepicker__popover" role="dialog" aria-label="Choose date">
            <Calendar value={value} min={min} max={max} onSelect={handleSelect} />
            <div className="datepicker__footer">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => handleSelect(todayISO())}
                disabled={(min && todayISO() < min) || (max && todayISO() > max)}
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
    </Field>
  );
}
