import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { login } from '../slices/authSlice';
import { ROUTES } from '../constants/routes';
import { applyFieldErrors } from '../utils/extractApiError';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email address').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'admin@emr.com', password: 'Admin@123' },
  { role: 'Receptionist', email: 'reception@emr.com', password: 'Recep@123' },
  { role: 'Doctor', email: 'doctor1@emr.com', password: 'Doctor@123' },
];

export default function LoginPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user, status, error } = useSelector((state) => state.auth);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to={location.state?.from || ROUTES.DASHBOARD} replace />;

  const onSubmit = async (values) => {
    const result = await dispatch(login(values));
    if (login.rejected.match(result) && result.payload?.fieldErrors) {
      applyFieldErrors(setError, result.payload.fieldErrors, ['email', 'password']);
    }
  };

  const fillDemo = (account) => {
    setValue('email', account.email);
    setValue('password', account.password);
  };

  return (
    <>
      <h1 className="auth-card__title">Welcome back</h1>
      <p className="auth-card__subtitle">Sign in to see the schedule for today. Your information stays private and secure.</p>

      {error && !Object.keys(error.fieldErrors || {}).length && (
        <div className="alert alert--error" role="alert">
          {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="stack stack--sm">
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          adornment={
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} />
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="lg" loading={status === 'loading'} className="btn--block">
          {status === 'loading' ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {import.meta.env.DEV && (
        <div className="demo-box">
          <p className="demo-box__title">Demo credentials (development only)</p>
          <ul>
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button type="button" className="demo-box__btn" onClick={() => fillDemo(account)}>
                  <strong>{account.role}</strong>
                  <span>
                    {account.email} / {account.password}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
