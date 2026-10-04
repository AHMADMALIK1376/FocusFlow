import { useEffect, useState } from 'react';
import { authAPI } from '../../services/api';

// Years the student has had an account, newest first — e.g. an account made
// in 2026 gives [2026]; in 2027 it becomes [2027, 2026]. Asked once per page
// load and shared by every year picker.
let createdYearPromise = null;

function createdYear() {
  if (!createdYearPromise) {
    createdYearPromise = authAPI.getMe()
      .then((me) => new Date(me.createdAt).getFullYear())
      .catch(() => {
        createdYearPromise = null; // try again next time
        return null;
      });
  }
  return createdYearPromise;
}

export function yearsSince(startYear, currentYear) {
  if (!startYear || startYear > currentYear) return [currentYear];
  const out = [];
  for (let y = currentYear; y >= startYear; y--) out.push(y);
  return out;
}

export function useAccountYears() {
  const currentYear = new Date().getFullYear();
  const [years, setYears] = useState([currentYear]);
  useEffect(() => {
    let alive = true;
    createdYear().then((y) => { if (alive) setYears(yearsSince(y, currentYear)); });
    return () => { alive = false; };
  }, [currentYear]);
  return years;
}
