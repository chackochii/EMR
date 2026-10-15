import Icon from '../Icon';

export default function StatCard({ label, value, tone = 'primary', icon = 'activity' }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__icon" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
    </div>
  );
}
