import { dayProgress, fmt12 } from './todayClasses';

// Monday from the real timetable (out of order on purpose).
const MON = [
  { subject: 'Web Engineering', startTime: '12:41', endTime: '14:45', room: 'LR42' },
  { subject: 'Internet of Things', startTime: '11:10', endTime: '12:40', room: 'LR29' },
];
const at = (h, m = 0) => h * 60 + m;

describe('dayProgress', () => {
  it('before the first class: total + the first one is next', () => {
    const p = dayProgress(MON, at(9));
    expect(p).toMatchObject({ total: 2, done: 0, current: null, allDone: false });
    expect(p.next.subject).toBe('Internet of Things');
  });
  it('during a class: that class is current, the following one is next', () => {
    const p = dayProgress(MON, at(11, 30));
    expect(p.current.subject).toBe('Internet of Things');
    expect(p.next.subject).toBe('Web Engineering');
    expect(p.done).toBe(0);
  });
  it('in the gap between classes', () => {
    const p = dayProgress(MON, at(12, 40));
    expect(p.current).toBeNull();
    expect(p.done).toBe(1);
    expect(p.next.subject).toBe('Web Engineering');
  });
  it('after the last class: all done, total still shown', () => {
    const p = dayProgress(MON, at(15));
    expect(p).toMatchObject({ total: 2, done: 2, current: null, next: null, allDone: true });
  });
  it('upcoming lists the class on now and every later one', () => {
    expect(dayProgress(MON, at(9)).upcoming.map((c) => c.subject)).toEqual(['Internet of Things', 'Web Engineering']);
    expect(dayProgress(MON, at(11, 30)).upcoming.map((c) => c.subject)).toEqual(['Internet of Things', 'Web Engineering']);
    expect(dayProgress(MON, at(13)).upcoming.map((c) => c.subject)).toEqual(['Web Engineering']);
    expect(dayProgress(MON, at(15)).upcoming).toEqual([]);
  });
  it('no classes today', () => {
    expect(dayProgress([], at(10))).toMatchObject({ total: 0, allDone: false, next: null });
  });
});

describe('fmt12', () => {
  it('formats 24h to 12h', () => {
    expect(fmt12('11:10')).toBe('11:10 AM');
    expect(fmt12('14:45')).toBe('2:45 PM');
    expect(fmt12('12:41')).toBe('12:41 PM');
    expect(fmt12('')).toBe('');
  });
});
