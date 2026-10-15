import { useCallback, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Select from '../components/Select';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { Skeleton } from '../components/Loading';
import CreateUserModal from '../features/users/CreateUserModal';
import { useFetch } from '../hooks/useFetch';
import { usePagination } from '../hooks/usePagination';
import { userService } from '../services/userService';
import { ROLES, ROLE_LABELS } from '../constants/roles';
import { avatarTone, getInitials } from '../utils/formatters';
import { formatDate } from '../utils/date';

const ROLE_FILTER_OPTIONS = [ROLES.DOCTOR, ROLES.RECEPTIONIST].map((value) => ({ value, label: ROLE_LABELS[value] }));

export default function UsersPage() {
  const [role, setRole] = useState('');
  const [creating, setCreating] = useState(false);
  const { page, limit, setPage, setLimit } = usePagination();

  const fetcher = useCallback(
    (signal) => userService.list({ page, limit, ...(role ? { role } : {}) }, signal),
    [page, limit, role],
  );
  const { data, loading, error, reload } = useFetch(fetcher);

  const handleRoleChange = (event) => {
    setRole(event.target.value);
    setPage(1);
  };

  const handleCreated = useCallback(() => {
    setPage(1);
    reload({ silent: true });
  }, [setPage, reload]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="skeleton-table" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton-table__row">
              <Skeleton height="1.1rem" />
            </div>
          ))}
        </div>
      );
    }
    if (error) return <ErrorState message={error.message} onRetry={reload} />;
    if (!data?.items.length) return <EmptyState title="No users found" description="Create a doctor or receptionist to get started." />;
    const { items, meta } = data;
    return (
      <>
        <div className="table-wrap">
          <table className="table table--cards">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Mobile</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => (
                <tr key={user.id}>
                  <td data-label="Name">
                    <div className="person">
                      <span className={`avatar avatar--${avatarTone(user.name)}`} aria-hidden="true">
                        {getInitials(user.name)}
                      </span>
                      <span className="cell-strong">{user.name}</span>
                    </div>
                  </td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Role">
                    <span className="chip">{ROLE_LABELS[user.role] || user.role}</span>
                  </td>
                  <td data-label="Mobile">{user.mobile || '—'}</td>
                  <td data-label="Created">{user.createdAt ? formatDate(user.createdAt.slice(0, 10)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={meta?.page ?? page}
          totalPages={meta?.totalPages ?? 1}
          total={meta?.total ?? items.length}
          limit={meta?.limit ?? limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </>
    );
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage doctors and receptionists."
        actions={<Button onClick={() => setCreating(true)}>Create user</Button>}
      />
      <section className="card">
        <div className="filters-grid filters-grid--single">
          <Select label="Role" placeholder="All roles" options={ROLE_FILTER_OPTIONS} value={role} onChange={handleRoleChange} />
        </div>
      </section>
      <section className="card card--flush" aria-live="polite">
        {renderContent()}
      </section>
      <CreateUserModal open={creating} onClose={() => setCreating(false)} onCreated={handleCreated} />
    </>
  );
}
