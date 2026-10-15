export default function EmptyState({ title, description, action }) {
  return (
    <div className="state state--empty">
      <svg className="state__art" width="132" height="104" viewBox="0 0 132 104" fill="none" aria-hidden="true" focusable="false">
        <circle cx="66" cy="50" r="44" className="art-halo" />
        <ellipse cx="66" cy="94" rx="34" ry="5" className="art-shadow" />
        <rect x="30" y="16" width="72" height="70" rx="12" className="art-card" />
        <path d="M30 28a12 12 0 0 1 12-12h48a12 12 0 0 1 12 12v8H30z" className="art-accent" />
        <rect x="42" y="46" width="30" height="5" rx="2.5" className="art-line" />
        <rect x="42" y="57" width="48" height="5" rx="2.5" className="art-line" />
        <rect x="42" y="68" width="22" height="5" rx="2.5" className="art-line" />
        <circle cx="98" cy="72" r="14" className="art-lens" />
        <path d="M98 65.5v13M91.5 72h13" className="art-plus" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <h3 className="state__title">{title}</h3>
      {description && <p className="state__text">{description}</p>}
      {action}
    </div>
  );
}
