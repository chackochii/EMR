import { Controller } from 'react-hook-form';
import Input from '../../components/Input';
import Select from '../../components/Select';
import DatePicker from '../../components/DatePicker';
import { GENDER_OPTIONS } from '../../constants';
import { todayISO } from '../../utils/date';

export default function NewPatientForm({ register, control, errors = {} }) {
  return (
    <div className="form-grid">
      <Input label="Full name" required autoComplete="off" error={errors.name?.message} {...register('newPatient.name')} />
      <Input
        label="Mobile number"
        required
        inputMode="numeric"
        maxLength={10}
        placeholder="10-digit number"
        error={errors.mobile?.message}
        {...register('newPatient.mobile')}
      />
      <Select
        label="Gender"
        required
        placeholder="Select gender"
        options={GENDER_OPTIONS}
        error={errors.gender?.message}
        {...register('newPatient.gender')}
      />
      <Input
        label="Age"
        inputMode="numeric"
        maxLength={3}
        hint="Or provide a date of birth"
        error={errors.age?.message}
        {...register('newPatient.age')}
      />
      <Controller
        name="newPatient.dateOfBirth"
        control={control}
        render={({ field }) => (
          <DatePicker
            label="Date of birth (optional)"
            value={field.value}
            onChange={field.onChange}
            max={todayISO()}
            clearable
            error={errors.dateOfBirth?.message}
          />
        )}
      />
      <Input
        label="Email (optional)"
        type="email"
        autoComplete="off"
        error={errors.email?.message}
        {...register('newPatient.email')}
      />
    </div>
  );
}
