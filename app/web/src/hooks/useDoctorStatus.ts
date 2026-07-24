import { useCallback, useEffect, useState } from "react";
import { getDoctor, type DoctorResult } from "../api";

/** One-shot doctor fetch for the sidebar status dot. */
export function useDoctorStatus() {
  const [doctor, setDoctor] = useState<DoctorResult | null>(null);

  const refresh = useCallback(() => {
    getDoctor()
      .then(setDoctor)
      .catch(() => setDoctor(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { doctor, refresh };
}
