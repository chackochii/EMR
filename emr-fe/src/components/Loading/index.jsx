export function Spinner({ size = 'md', label = 'Loading' }) {
  return (
    <span className={`spinner spinner--${size}`} role={label ? 'status' : undefined} aria-label={label || undefined} />
  );
}

export function Skeleton({ width = '100%', height = '1rem', className = '' }) {
  return <span className={`skeleton ${className}`.trim()} style={{ width, height }} aria-hidden="true" />;
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <Spinner size="lg" label="" />
      <p>{label}</p>
    </div>
  );
}
