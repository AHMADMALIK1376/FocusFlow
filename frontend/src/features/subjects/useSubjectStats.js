import { useState, useEffect, useCallback, useMemo } from 'react';
import { subjectAPI, subjectAttendanceAPI, gradeAPI } from '../../services/api';
import { buildStats, groupGrades } from './subjectStats';

// Loads what the Subjects chart needs. Pass the subjects you already have to
// avoid a second request; otherwise the hook loads the current ones itself.
// Each source fails on its own: a failed grades call still shows attendance.
export function useSubjectStats(passedSubjects) {
  const [own, setOwn] = useState([]);
  const [overview, setOverview] = useState(null);
  const [gradeList, setGradeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const needSubjects = !passedSubjects;

  const refresh = useCallback(async () => {
    setLoading(true);
    const [subs, att, grd] = await Promise.allSettled([
      needSubjects ? subjectAPI.getAll() : Promise.resolve(null),
      subjectAttendanceAPI.getOverview(),
      gradeAPI.getAll(),
    ]);
    if (needSubjects && subs.status === 'fulfilled') {
      setOwn((Array.isArray(subs.value) ? subs.value : []).filter((s) => !s.isArchived));
    }
    if (att.status === 'fulfilled') setOverview(att.value);
    if (grd.status === 'fulfilled') setGradeList(grd.value);
    const failed = [subs, att, grd].find((r) => r.status === 'rejected');
    setError(failed ? (failed.reason && failed.reason.message) || 'Failed to load some figures' : null);
    setLoading(false);
  }, [needSubjects]);

  useEffect(() => { refresh(); }, [refresh]);

  const subjects = passedSubjects || own;
  const stats = useMemo(
    () => buildStats({ subjects, attendanceOverview: overview, gradesBySubject: groupGrades(gradeList) }),
    [subjects, overview, gradeList]
  );

  return { stats, loading, error, refresh };
}
