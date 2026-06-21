// Audience segmentation: derive a generation label from age.
// Baseline year 2026 (standard generation birth-year bands).

export function segmentFromAge(age) {
  if (
    age == null ||
    typeof age !== 'number' ||
    Number.isNaN(age) ||
    age < 0 ||
    age > 130
  ) {
    return 'Unknown';
  }
  if (age <= 13) return 'Gen Alpha';
  if (age <= 29) return 'Gen Z';
  if (age <= 45) return 'Millennial';
  if (age <= 61) return 'Gen X';
  return 'Boomer';
}

// Compute age from a date-of-birth string/Date (returns null if invalid).
export function ageFromDOB(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function segmentFromDOB(dob) {
  return segmentFromAge(ageFromDOB(dob));
}
