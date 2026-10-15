import { Outlet } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import Icon from '../components/Icon';
import ThemeToggle from '../components/ThemeToggle';

const HIGHLIGHTS = [
  { icon: 'bolt', text: 'Live slot availability across every doctor' },
  { icon: 'calendar-plus', text: 'Book, reschedule and cancel in seconds' },
  { icon: 'shield', text: 'Role-based access for front desk and clinicians' },
];

export default function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-hero" aria-label="About EMR Appointments">
        <div className="brand">
          <BrandMark />
          <span className="brand__name">EMR Appointments</span>
        </div>
        <div className="auth-hero__body">
          <h2 className="auth-hero__title">Calm, clear scheduling for your clinic.</h2>
          <p className="auth-hero__lead">
            Everything you need for appointments, doctor availability and patient flow, in one quiet place.
          </p>
          <ul className="auth-hero__list">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text}>
                <span className="auth-hero__icon">
                  <Icon name={item.icon} size={16} />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-hero__foot">Patient information stays private and secure.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-panel__theme">
          <ThemeToggle />
        </div>
        <div className="auth-card">
          <div className="brand brand--mobile">
            <BrandMark />
            <span className="brand__name">EMR Appointments</span>
          </div>
          <Outlet />
        </div>
      </section>
    </main>
  );
}
