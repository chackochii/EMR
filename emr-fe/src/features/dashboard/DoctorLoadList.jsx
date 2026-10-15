import { getInitials } from '../../utils/formatters';

/** Per-doctor workload: bar width is relative to the busiest doctor. */
export default function DoctorLoadList({ items }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <ul className="bar-list">
      {items.map((item) => (
        <li key={item.doctorId} className="bar-list__item">
          <span className="avatar avatar--sm" aria-hidden="true">
            {getInitials(item.name)}
          </span>
          <span className="bar-list__label">{item.name}</span>
          <span className="bar-list__track" aria-hidden="true">
            <span className="bar-list__fill" style={{ width: `${(item.count / max) * 100}%` }} />
          </span>
          <span className="bar-list__value">
            {item.count}
            <span className="sr-only"> appointments</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
