import { Skeleton } from '../../components/Loading';

export default function AppointmentTableSkeleton({ rows = 6 }) {
  return (
    <div className="skeleton-table" aria-busy="true" aria-label="Loading appointments">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-table__row">
          <Skeleton height="1.1rem" />
        </div>
      ))}
    </div>
  );
}
