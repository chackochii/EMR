import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import AppointmentFiltersBar from '../features/appointments/AppointmentFiltersBar';
import AppointmentTable from '../features/appointments/AppointmentTable';
import AppointmentTableSkeleton from '../features/appointments/AppointmentTableSkeleton';
import AppointmentDetailsModal from '../features/appointments/AppointmentDetailsModal';
import EditAppointmentModal from '../features/appointments/EditAppointmentModal';
import CancelAppointmentDialog from '../features/appointments/CancelAppointmentDialog';
import { ACTIONS } from '../features/appointments/permissions';
import { useAppointmentActions } from '../features/appointments/useAppointmentActions';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { useUrlParams } from '../hooks/useUrlParams';
import { appointmentService } from '../services/appointmentService';
import { ROLES } from '../constants/roles';
import { ROUTES } from '../constants/routes';
import { DEFAULT_PAGE_SIZE } from '../constants';
import { compactObject } from '../utils/formatters';

const FILTER_KEYS = ['patient', 'doctor', 'mobile', 'departmentId', 'doctorId', 'status', 'dateFrom', 'dateTo'];

export default function AppointmentListPage() {
  const { role, can } = useAuth();
  const [searchParams, updateParams] = useUrlParams();
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const queryString = searchParams.toString();
  const filters = useMemo(() => Object.fromEntries(new URLSearchParams(queryString)), [queryString]);

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || DEFAULT_PAGE_SIZE;
  const sortBy = filters.sortBy || 'date';
  const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

  const apiParams = useMemo(
    () => compactObject({ page, limit, sortBy, sortOrder, ...Object.fromEntries(FILTER_KEYS.map((key) => [key, filters[key]])) }),
    [filters, page, limit, sortBy, sortOrder],
  );
  const fetcher = useCallback((signal) => appointmentService.list(apiParams, signal), [apiParams]);
  const { data, loading, error, reload } = useFetch(fetcher);

  const refresh = useCallback(() => reload({ silent: true }), [reload]);
  const { busyId, arrive, complete, cancel } = useAppointmentActions(refresh);

  const handleSort = useCallback(
    (key) => updateParams({ sortBy: key, sortOrder: sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc', page: 1 }),
    [updateParams, sortBy, sortOrder],
  );

  const handleAction = useCallback(
    (action, appointment) => {
      if (action === ACTIONS.VIEW) setViewing(appointment);
      else if (action === ACTIONS.EDIT) setEditing(appointment);
      else if (action === ACTIONS.CANCEL) setCancelling(appointment);
      else if (action === ACTIONS.ARRIVE) arrive(appointment.id);
      else if (action === ACTIONS.COMPLETE) complete(appointment.id);
    },
    [arrive, complete],
  );

  const confirmCancel = async (reason) => {
    if (await cancel(cancelling.id, reason)) setCancelling(null);
  };

  const closeViewing = useCallback(() => setViewing(null), []);
  const closeEditing = useCallback(() => setEditing(null), []);
  const closeCancelling = useCallback(() => setCancelling(null), []);
  const handlePageChange = useCallback((next) => updateParams({ page: next }), [updateParams]);
  const handleLimitChange = useCallback((next) => updateParams({ limit: next, page: 1 }), [updateParams]);

  const appointments = data?.items;
  const meta = data?.meta;
  const hasFilters = FILTER_KEYS.some((key) => filters[key]);

  const renderContent = () => {
    if (loading) return <AppointmentTableSkeleton />;
    if (error) return <ErrorState message={error.message} onRetry={reload} />;
    if (!appointments?.length) {
      return (
        <EmptyState
          title={hasFilters ? 'No appointments match your filters' : 'No appointments yet'}
          description={hasFilters ? 'Try adjusting or clearing the filters.' : 'Booked appointments will appear here.'}
          action={
            !hasFilters &&
            can('BOOK') && (
              <Link to={ROUTES.BOOK} className="btn btn--primary btn--md">
                Book appointment
              </Link>
            )
          }
        />
      );
    }
    return (
      <>
        <AppointmentTable
          appointments={appointments}
          role={role}
          busyId={busyId}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onAction={handleAction}
        />
        <Pagination
          page={meta?.page ?? page}
          totalPages={meta?.totalPages ?? 1}
          total={meta?.total ?? appointments.length}
          limit={meta?.limit ?? limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </>
    );
  };

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle={role === ROLES.DOCTOR ? 'Your appointments.' : 'Search, filter and manage appointments.'}
        actions={
          can('BOOK') && (
            <Link to={ROUTES.BOOK} className="btn btn--primary btn--md">
              Book appointment
            </Link>
          )
        }
      />
      <section className="card">
        <AppointmentFiltersBar filters={filters} onChange={updateParams} showDoctorFilter={role !== ROLES.DOCTOR} />
      </section>
      <section className="card card--flush" aria-live="polite">
        {renderContent()}
      </section>

      <AppointmentDetailsModal open={Boolean(viewing)} appointment={viewing} onClose={closeViewing} />
      {editing && <EditAppointmentModal appointment={editing} role={role} onClose={closeEditing} onSaved={refresh} />}
      {cancelling && (
        <CancelAppointmentDialog
          appointment={cancelling}
          loading={busyId === cancelling.id}
          onConfirm={confirmCancel}
          onClose={closeCancelling}
        />
      )}
    </>
  );
}
