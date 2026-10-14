import { renderHook, waitFor, act } from '@testing-library/react';
import { useSubjectStats } from './useSubjectStats';
import { subjectAPI, subjectAttendanceAPI, gradeAPI } from '../../services/api';

jest.mock('../../services/api', () => ({
  subjectAPI: { getAll: jest.fn() },
  subjectAttendanceAPI: { getOverview: jest.fn() },
  gradeAPI: { getAll: jest.fn() },
}));

const subjects = [{ id: 1, name: 'Math', code: 'M1', creditHours: 3 }];
const overview = { subjects: [{ id: 1, present: 3, absent: 1, late: 0 }] };
const grades = [{ subjectId: 1, score: 80, maxScore: 100, weight: 1 }];

beforeEach(() => {
  subjectAPI.getAll.mockResolvedValue([...subjects, { id: 9, name: 'Old', isArchived: true }]);
  subjectAttendanceAPI.getOverview.mockResolvedValue(overview);
  gradeAPI.getAll.mockResolvedValue(grades);
});

it('loads its own subjects, attendance and grades in single calls', async () => {
  const { result } = renderHook(() => useSubjectStats());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.stats.subjects).toHaveLength(1);
  expect(result.current.stats.subjects[0].attendance.pct).toBe(75);
  expect(result.current.stats.subjects[0].grade.pct).toBe(80);
  expect(gradeAPI.getAll).toHaveBeenCalledTimes(1);
  expect(result.current.error).toBeNull();
});

it('reuses subjects passed by the caller without fetching them', async () => {
  const { result } = renderHook(() => useSubjectStats(subjects));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(subjectAPI.getAll).not.toHaveBeenCalled();
  expect(result.current.stats.overall.attendance.pct).toBe(75);
});

it('still shows attendance when the grades call fails', async () => {
  gradeAPI.getAll.mockRejectedValue(new Error('boom'));
  const { result } = renderHook(() => useSubjectStats(subjects));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('boom');
  expect(result.current.stats.subjects[0].attendance.pct).toBe(75);
  expect(result.current.stats.subjects[0].grade.hasGrades).toBe(false);
});

it('refresh loads again', async () => {
  const { result } = renderHook(() => useSubjectStats(subjects));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { await result.current.refresh(); });
  expect(subjectAttendanceAPI.getOverview).toHaveBeenCalledTimes(2);
});
