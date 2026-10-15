import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import ConnectionIndicator from '../components/ConnectionIndicator';
import ErrorBoundary from '../components/ErrorBoundary';
import BrandMark from '../components/BrandMark';
import Icon from '../components/Icon';
import ThemeToggle from '../components/ThemeToggle';
import UserMenu from '../components/UserMenu';
import { LoadingState } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { useSocketConnection } from '../hooks/useSocket';
import { logout } from '../slices/authSlice';
import { ROLE_LABELS } from '../constants/roles';
import { ROUTES } from '../constants/routes';
import { getInitials } from '../utils/formatters';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: ROUTES.DASHBOARD, label: 'Dashboard', icon: 'dashboard', capability: 'DASHBOARD', end: true }],
  },
  {
    label: 'Appointments',
    items: [
      { to: ROUTES.SCHEDULER, label: 'Scheduler', icon: 'calendar', capability: 'SCHEDULER' },
      { to: ROUTES.BOOK, label: 'Book appointment', icon: 'calendar-plus', capability: 'BOOK' },
      { to: ROUTES.APPOINTMENTS, label: 'Appointments', icon: 'list', capability: 'APPOINTMENTS' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: ROUTES.DOCTOR_SCHEDULE, label: 'Doctor schedules', icon: 'clock', capability: 'DOCTOR_SCHEDULE' },
      { to: ROUTES.USERS, label: 'Users', icon: 'users', capability: 'USERS' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

const RAIL_KEY = 'emr-sidebar-collapsed';

const readRail = () => {
  try {
    return localStorage.getItem(RAIL_KEY) === '1';
  } catch {
    return false;
  }
};

export default function DashboardLayout() {
  const dispatch = useDispatch();
  const { user, can } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rail, setRail] = useState(readRail);

  useSocketConnection();

  useEffect(() => {
    try {
      localStorage.setItem(RAIL_KEY, rail ? '1' : '0');
    } catch {
      /* storage unavailable: the preference simply is not remembered */
    }
  }, [rail]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const currentItem = ALL_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  const roleLabel = ROLE_LABELS[user.role];
  const handleLogout = () => dispatch(logout());

  return (
    <div className={`shell ${rail ? 'shell--rail' : ''}`.trim()}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside id="sidebar" className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`} aria-label="Primary">
        <div className="brand">
          <BrandMark />
          <span className="brand__name">EMR Appointments</span>
        </div>
        <nav className="sidebar__nav" aria-label="Main">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => can(item.capability));
            if (!items.length) return null;
            return (
              <div key={group.label} className="nav-group">
                <p className="nav-group__label">{group.label}</p>
                <ul className="nav">
                  {items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        data-tip={item.label}
                        className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}
                      >
                        <Icon name={item.icon} size={18} />
                        <span className="nav__text">{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
        <button
          type="button"
          className="sidebar__toggle"
          data-tip={rail ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setRail((value) => !value)}
        >
          <Icon name="panel" size={18} />
          <span className="sidebar__toggle-text">{rail ? 'Expand sidebar' : 'Collapse sidebar'}</span>
        </button>
        <div className="user-card">
          <span className="avatar avatar--lg" aria-hidden="true">
            {getInitials(user.name)}
          </span>
          <div className="user-card__text">
            <span className="user-card__name">{user.name}</span>
            <span className="role-badge">{roleLabel}</span>
          </div>
        </div>
      </aside>
      {menuOpen && <div className="shell__overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className="shell__main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn icon-btn--bordered topbar__menu"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            aria-controls="sidebar"
          >
            <Icon name={menuOpen ? 'x' : 'menu'} />
          </button>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="breadcrumb__current" aria-current="page">
              {currentItem?.label || 'Page'}
            </span>
          </nav>
          <div className="topbar__spacer" />
          <ConnectionIndicator />
          <ThemeToggle />
          <UserMenu name={user.name} email={user.email} roleLabel={roleLabel} onLogout={handleLogout} />
        </header>
        <main id="main-content" className="content" tabIndex={-1}>
          <div className="page-enter" key={pathname}>
            <ErrorBoundary key={pathname}>
              <Suspense fallback={<LoadingState />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
