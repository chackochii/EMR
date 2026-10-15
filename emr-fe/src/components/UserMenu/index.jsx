import { useEffect, useId, useRef, useState } from 'react';
import Icon from '../Icon';
import { getInitials } from '../../utils/formatters';

/** Avatar button that opens a small account menu (identity + sign out). */
export default function UserMenu({ name, email, roleLabel, onLogout }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="user-menu__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${name}`}
      >
        <span className="avatar" aria-hidden="true">
          {getInitials(name)}
        </span>
        <span className="user-menu__identity">
          <span className="user-menu__name">{name}</span>
          <span className="user-menu__role">{roleLabel}</span>
        </span>
        <Icon name="chevron-down" size={16} className="user-menu__chevron" />
      </button>
      {open && (
        <div className="user-menu__panel" id={menuId} role="menu" aria-label="Account">
          <div className="user-menu__head">
            <span className="user-menu__name">{name}</span>
            {email && <span className="user-menu__role">{email}</span>}
            <span className="role-badge">{roleLabel}</span>
          </div>
          <button type="button" role="menuitem" className="user-menu__item" onClick={onLogout} autoFocus>
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
