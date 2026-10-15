import { useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { departmentService } from '../../services/departmentService';
import { doctorService } from '../../services/doctorService';

export function useDepartments() {
  const fetcher = useCallback((signal) => departmentService.list(signal), []);
  return useFetch(fetcher);
}

export function useDoctors(departmentId = '') {
  const fetcher = useCallback(
    (signal) => doctorService.list(departmentId ? { departmentId } : {}, signal),
    [departmentId],
  );
  return useFetch(fetcher);
}
