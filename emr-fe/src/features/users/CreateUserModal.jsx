import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Select from '../../components/Select';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { userService } from '../../services/userService';
import { ROLES } from '../../constants/roles';
import { MOBILE_REGEX } from '../../constants';
import { applyFieldErrors } from '../../utils/extractApiError';
import { compactObject } from '../../utils/formatters';
import { useDepartments } from '../doctors/hooks';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter the full name'),
    email: z.string().trim().min(1, 'Enter an email address').email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum([ROLES.DOCTOR, ROLES.RECEPTIONIST], { errorMap: () => ({ message: 'Select a role' }) }),
    mobile: z.string().trim().refine((v) => v === '' || MOBILE_REGEX.test(v), 'Enter a valid 10-digit mobile number'),
    departmentId: z.string(),
    specialization: z.string().trim().max(100, 'Keep this under 100 characters'),
  })
  .refine((user) => user.role !== ROLES.DOCTOR || user.departmentId !== '', {
    message: 'Select a department for the doctor',
    path: ['departmentId'],
  });

const FIELDS = ['name', 'email', 'password', 'role', 'mobile', 'departmentId', 'specialization'];

const ROLE_OPTIONS = [
  { value: ROLES.DOCTOR, label: 'Doctor' },
  { value: ROLES.RECEPTIONIST, label: 'Receptionist' },
];

export default function CreateUserModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const { data: departments } = useDepartments();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', role: ROLES.DOCTOR, mobile: '', departmentId: '', specialization: '' },
  });

  const isDoctor = watch('role') === ROLES.DOCTOR;
  const departmentOptions = useMemo(
    () => (departments || []).map(({ id, name }) => ({ value: id, label: name })),
    [departments],
  );

  const create = useCallback((values) => {
    const doctorFields = values.role === ROLES.DOCTOR ? {} : { departmentId: '', specialization: '' };
    return userService.create(compactObject({ ...values, ...doctorFields }));
  }, []);
  const { loading, run } = useAsync(create);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (values) =>
    run(values)
      .then(() => {
        toast.success('User created');
        reset();
        onCreated();
        onClose();
      })
      .catch((apiError) => {
        if (!applyFieldErrors(setError, apiError.fieldErrors, FIELDS)) toast.error(apiError.message);
      });

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : handleClose}
      title="Create user"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="create-user-form" loading={loading}>
            Create user
          </Button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit(onSubmit)} noValidate className="form-grid">
        <Select label="Role" required options={ROLE_OPTIONS} error={errors.role?.message} {...register('role')} />
        <Input label="Full name" required autoComplete="off" error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" required autoComplete="off" error={errors.email?.message} {...register('email')} />
        <Input
          label="Temporary password"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Mobile (optional)"
          inputMode="numeric"
          maxLength={10}
          error={errors.mobile?.message}
          {...register('mobile')}
        />
        {isDoctor && (
          <>
            <Select
              label="Department"
              required
              placeholder="Select department"
              options={departmentOptions}
              error={errors.departmentId?.message}
              {...register('departmentId')}
            />
            <Input
              label="Specialization (optional)"
              error={errors.specialization?.message}
              {...register('specialization')}
            />
          </>
        )}
      </form>
    </Modal>
  );
}
