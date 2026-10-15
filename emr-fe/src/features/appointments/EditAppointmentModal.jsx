import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { appointmentService } from '../../services/appointmentService';
import { ROLES } from '../../constants/roles';
import { applyFieldErrors } from '../../utils/extractApiError';

const schema = z.object({
  purpose: z.string().trim().min(3, 'Enter the purpose of the visit').max(200, 'Keep the purpose under 200 characters'),
  notes: z.string().trim().max(1000, 'Keep notes under 1000 characters'),
});

const FIELDS = ['purpose', 'notes'];

export default function EditAppointmentModal({ appointment, role, onClose, onSaved }) {
  const toast = useToast();
  const doctorOnly = role === ROLES.DOCTOR;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { purpose: appointment?.purpose || '', notes: appointment?.notes || '' },
  });

  useEffect(() => {
    if (appointment) reset({ purpose: appointment.purpose || '', notes: appointment.notes || '' });
  }, [appointment, reset]);

  const save = useCallback(
    (values) => appointmentService.update(appointment.id, doctorOnly ? { notes: values.notes } : values),
    [appointment, doctorOnly],
  );
  const { loading, run } = useAsync(save);

  const onSubmit = (values) =>
    run(values)
      .then(() => {
        toast.success('Appointment updated');
        onSaved();
        onClose();
      })
      .catch((apiError) => {
        if (!applyFieldErrors(setError, apiError.fieldErrors, FIELDS)) toast.error(apiError.message);
      });

  return (
    <Modal
      open={Boolean(appointment)}
      onClose={loading ? () => {} : onClose}
      title="Edit appointment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="edit-appointment-form" loading={loading}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-appointment-form" onSubmit={handleSubmit(onSubmit)} noValidate className="stack stack--sm">
        <Input
          label="Purpose of visit"
          required
          disabled={doctorOnly}
          error={errors.purpose?.message}
          data-autofocus={doctorOnly ? undefined : ''}
          {...register('purpose')}
        />
        <Textarea
          label="Notes"
          rows={4}
          error={errors.notes?.message}
          data-autofocus={doctorOnly ? '' : undefined}
          {...register('notes')}
        />
      </form>
    </Modal>
  );
}
