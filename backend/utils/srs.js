// Pure Leitner spaced-repetition helpers — no DB, unit-testable.
// Box 1..5. INTERVALS = days until a card in that box is due again.
const INTERVALS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };

// Correct answer promotes a card (cap 5); a wrong answer resets it to box 1.
function nextBox(box, correct) {
  return correct ? Math.min(5, (Number(box) || 1) + 1) : 1;
}

// Due date (YYYY-MM-DD) for a card now in `box`, counting from `from`.
// Uses local date parts (not toISOString) so it never shifts a day in +offset timezones.
function dueDate(box, from = new Date()) {
  const days = INTERVALS[box] != null ? INTERVALS[box] : 0;
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

module.exports = { INTERVALS, nextBox, dueDate };
