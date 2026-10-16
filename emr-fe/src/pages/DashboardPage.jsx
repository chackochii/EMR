import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import ErrorState from '../components/ErrorState';
import Icon from '../components/Icon';
import { Skeleton } from '../components/Loading';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import DoctorLoadList from '../features/dashboard/DoctorLoadList';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { dashboardService } from '../services/dashboardService';
import { APPOINTMENT_STATUS, APPOINTMENT_STATUS_LABELS } from '../constants/statuses';
import { ROUTES } from '../constants/routes';
import { formatLongDate, todayISO } from '../utils/date';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  return hour < 18 ? 'Good afternoon' : 'Good evening';
};

export default function DashboardPage() {
  const { user, can } = useAuth();
  const fetcher = useCallback((signal) => dashboardService.stats(signal), []);
  const { data: stats, loading, error, reload } = useFetch(fetcher);
  const showDoctorLoad = can('DOCTOR_LOAD');

  const renderStats = () => {
    if (loading) {
      return (
        <div className="stat-grid" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height="7rem" />
          ))}
        </div>
      );
    }
    if (error) return <ErrorState message={error.message} onRetry={reload} />;
    return (
      <>
        <div className="stat-grid">
          <StatCard label="Today" value={stats.today} tone="primary" icon="clock" />
          <StatCard label="Upcoming" value={stats.upcoming} tone="success" icon="calendar-plus" />
          <StatCard
            label={APPOINTMENT_STATUS_LABELS[APPOINTMENT_STATUS.ARRIVED]}
            value={stats.byStatus?.[APPOINTMENT_STATUS.ARRIVED] ?? 0}
            tone="info"
            icon="user-check"
          />
          <StatCard label="Total appointments" value={stats.total} tone="neutral" icon="list" />
        </div>
        <div className={`dash-grid ${showDoctorLoad ? 'dash-grid--two' : ''}`}>
          {showDoctorLoad && (
            <section className="card">
              <div className="card__head">
                <h2 className="card__title">Today by doctor</h2>
                <span className="card__meta">Appointments scheduled for today</span>
              </div>
              {stats.todayByDoctor?.length ? (
                <DoctorLoadList items={stats.todayByDoctor} />
              ) : (
                <EmptyState title="No appointments today" description="Today's doctor workload will show up here." />
              )}
            </section>
          )}
          <section className="card">
            <h2 className="card__title">Appointments by status</h2>
            <ul className="status-list">
              {Object.keys(APPOINTMENT_STATUS_LABELS).map((status) => (
                <li key={status}>
                  <StatusBadge status={status} />
                  <span className="status-list__count">{stats.byStatus?.[status] ?? 0}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </>
    );
  };

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name}`}
        subtitle={formatLongDate(todayISO())}
        actions={
          can('BOOK') && (
            <Link to={ROUTES.BOOK} className="btn btn--primary btn--md">
              <Icon name="calendar-plus" size={16} />
              Book appointment
            </Link>
          )
        }
      />
      {renderStats()}
      <section className="card" aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="card__title">
          Quick actions
        </h2>
        <div className="quick-actions">
          <Link to={ROUTES.SCHEDULER} className="btn btn--secondary btn--md">
            <Icon name="calendar" size={16} />
            Open scheduler
          </Link>
          {can('BOOK') && (
            <Link to={ROUTES.BOOK} className="btn btn--secondary btn--md">
              <Icon name="calendar-plus" size={16} />
              New booking
            </Link>
          )}
          <Link to={ROUTES.APPOINTMENTS} className="btn btn--secondary btn--md">
            <Icon name="list" size={16} />
            All appointments
          </Link>
        </div>
      </section>
    </>
  );
}
