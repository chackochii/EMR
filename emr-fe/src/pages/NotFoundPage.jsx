import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { ROUTES } from '../constants/routes';

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you are looking for does not exist."
      action={
        <Link to={ROUTES.DASHBOARD} className="btn btn--primary btn--md">
          Back to dashboard
        </Link>
      }
    />
  );
}
