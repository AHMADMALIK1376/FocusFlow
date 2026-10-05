// Compares what a scanner read against what's already in the account: which
// scanned rows are new, which match an existing item (and which fields
// differ), and which existing items the scan didn't mention.

export const isBlank = (v) =>
  v === null || v === undefined ||
  (typeof v === "string" && !v.trim()) ||
  (typeof v === "number" && Number.isNaN(v)) ||
  (Array.isArray(v) && v.length === 0);

const sameDefault = (a, b) => String(a ?? "").trim() === String(b ?? "").trim();

// Pair scanned rows with existing items one-to-one, best scores first.
// match(scanned, existing) → 0 (no match) .. 1 (certain).
export function matchItems(scanned, existing, match) {
  const pairs = [];
  scanned.forEach((s, i) => existing.forEach((e, j) => {
    const score = match(s, e);
    if (score > 0) pairs.push({ score, i, j });
  }));
  pairs.sort((a, b) => b.score - a.score || a.i - b.i || a.j - b.j);
  const byScanned = new Array(scanned.length).fill(null);
  const taken = new Set();
  for (const { i, j } of pairs) {
    if (byScanned[i] !== null || taken.has(j)) continue;
    byScanned[i] = j;
    taken.add(j);
  }
  return { byScanned, taken };
}

// fields: [{ key, label, same?(old, new), blank?(v), format?(v) }]
// A field the scan left empty is never a change: OCR missing a value must not
// wipe what the student already has.
export function diffFields(fields, scanned, existing) {
  const changes = [];
  for (const f of fields) {
    const to = scanned[f.key];
    const from = existing[f.key];
    if (f.blank ? f.blank(to) : isBlank(to)) continue;
    if ((f.same || sameDefault)(from, to)) continue;
    const fmt = f.format || ((v) => (isBlank(v) ? "" : String(v)));
    changes.push({ key: f.key, label: f.label, from: fmt(from), to: fmt(to) });
  }
  return changes;
}

/**
 * @returns {{ rows: Array<{data, existing, changes, status: "new"|"changed"|"same"}>,
 *             unmatched: Array, matched: number, mostlyDifferent: boolean }}
 * mostlyDifferent: the account already has data and fewer than half of the
 * scanned rows match it — most likely a whole new timetable / date sheet.
 */
export function reconcile(scanned, existing, { match, fields }) {
  const { byScanned, taken } = matchItems(scanned, existing, match);
  const rows = scanned.map((data, i) => {
    const ex = byScanned[i] === null ? null : existing[byScanned[i]];
    const changes = ex ? diffFields(fields, data, ex) : [];
    return { data, existing: ex, changes, status: !ex ? "new" : changes.length ? "changed" : "same" };
  });
  return {
    rows,
    unmatched: existing.filter((_, j) => !taken.has(j)),
    matched: taken.size,
    mostlyDifferent: existing.length > 0 && scanned.length > 0 && taken.size * 2 < scanned.length,
  };
}
