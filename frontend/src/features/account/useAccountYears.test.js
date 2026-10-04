import { yearsSince } from './useAccountYears';

describe('yearsSince', () => {
  it('only the current year for an account created this year', () => {
    expect(yearsSince(2026, 2026)).toEqual([2026]);
  });
  it('every year since the account was created, newest first', () => {
    expect(yearsSince(2024, 2026)).toEqual([2026, 2025, 2024]);
  });
  it('falls back to the current year when the date is unknown or in the future', () => {
    expect(yearsSince(null, 2026)).toEqual([2026]);
    expect(yearsSince(2030, 2026)).toEqual([2026]);
  });
});
