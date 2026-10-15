import { useCallback, useState } from 'react';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Spinner } from '../../components/Loading';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { patientService } from '../../services/patientService';
import { capitalize, formatPatientAge } from '../../utils/formatters';

const MIN_QUERY_LENGTH = 2;

export default function PatientSearch({ selected, onSelect, error }) {
  const [query, setQuery] = useState('');
  const term = useDebounce(query.trim(), 400);
  const enabled = term.length >= MIN_QUERY_LENGTH;

  const fetcher = useCallback((signal) => patientService.search(term, signal), [term]);
  const { data: results, loading, error: searchError } = useFetch(fetcher, { enabled });

  if (selected) {
    return (
      <div className="patient-card">
        <div>
          <p className="patient-card__name">{selected.name}</p>
          <p className="patient-card__meta">
            {selected.patientId} · {selected.mobile} · {capitalize(selected.gender)} · {formatPatientAge(selected)}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => onSelect(null)}>
          Change
        </Button>
      </div>
    );
  }

  const showResults = enabled && term === query.trim();

  return (
    <div className="patient-search">
      <Input
        label="Search patient"
        type="search"
        placeholder="Patient ID, mobile number or name"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
        error={error || searchError?.message}
        hint={`Type at least ${MIN_QUERY_LENGTH} characters`}
      />
      {enabled && loading && (
        <p className="patient-search__status">
          <Spinner size="sm" label="" /> Searching…
        </p>
      )}
      {showResults && !loading && results && results.length === 0 && (
        <p className="patient-search__status">No patients found. Try “New patient” to register one.</p>
      )}
      {showResults && !loading && results?.length > 0 && (
        <ul className="patient-search__results" aria-label="Matching patients">
          {results.map((patient) => (
            <li key={patient.id}>
              <button type="button" className="patient-search__option" onClick={() => onSelect(patient)}>
                <span className="patient-card__name">{patient.name}</span>
                <span className="patient-card__meta">
                  {patient.patientId} · {patient.mobile} · {capitalize(patient.gender)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
