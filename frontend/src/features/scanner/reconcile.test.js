import { reconcile, diffFields } from "./reconcile";
import { sameText, normCode } from "./textParse";

const match = (s, e) => (normCode(s.code) === normCode(e.code) ? 1 : 0);
const fields = [
  { key: "name", label: "Name", same: (a, b) => sameText(a, b) },
  { key: "instructor", label: "Instructor", same: (a, b) => sameText(a, b) },
  { key: "creditHours", label: "Credits", same: (a, b) => Number(a) === Number(b) },
];

const account = [
  { id: 1, code: "CSC452", name: "Compiler Construction", instructor: "Mr. Kayani", creditHours: 2 },
  { id: 2, code: "CMC381", name: "Artificial Intelligence", instructor: "Ms. Samavia Tariq", creditHours: 3 },
  { id: 3, code: "CSC467", name: "Internet of Things", instructor: "Ms. Seher Saeed", creditHours: 3 },
];

describe("reconcile", () => {
  test("same courses plus one new: only the new one is new", () => {
    const scanned = [
      { code: "CSC452", name: "Compiler Constructon", instructor: "Mr. Kayani", creditHours: 2 }, // OCR typo
      { code: "CMC381", name: "Artificial Intelligence", instructor: "Ms. Samavia Tariq", creditHours: 3 },
      { code: "CSC467", name: "Internet of Things", instructor: "Ms. Seher Saeed", creditHours: 3 },
      { code: "CSC312", name: "Web Engineering", instructor: "Dr. Faheem", creditHours: 2 },
    ];
    const r = reconcile(scanned, account, { match, fields });
    expect(r.rows.map((x) => x.status)).toEqual(["same", "same", "same", "new"]);
    expect(r.unmatched).toEqual([]);
    expect(r.mostlyDifferent).toBe(false);
  });

  test("a real difference is reported field by field", () => {
    const scanned = [{ code: "CMC381", name: "Artificial Intelligence", instructor: "Dr. Imran Khan", creditHours: 3 }];
    const [row] = reconcile(scanned, account, { match, fields }).rows;
    expect(row.status).toBe("changed");
    expect(row.existing.id).toBe(2);
    expect(row.changes).toEqual([{ key: "instructor", label: "Instructor", from: "Ms. Samavia Tariq", to: "Dr. Imran Khan" }]);
  });

  test("blank scanned fields never count as changes", () => {
    const changes = diffFields(fields, { name: "Compiler Construction", instructor: "", creditHours: null }, account[0]);
    expect(changes).toEqual([]);
  });

  test("a whole new timetable is flagged", () => {
    const scanned = [
      { code: "CSC501", name: "Machine Learning" },
      { code: "CSC502", name: "Cloud Computing" },
      { code: "CSC452", name: "Compiler Construction" },
    ];
    const r = reconcile(scanned, account, { match, fields });
    expect(r.matched).toBe(1);
    expect(r.mostlyDifferent).toBe(true);
    expect(r.unmatched.map((x) => x.id)).toEqual([2, 3]);
  });

  test("an empty account is never 'different'", () => {
    expect(reconcile([{ code: "CSC501" }], [], { match, fields }).mostlyDifferent).toBe(false);
  });

  test("each existing item matches at most one scanned row, best score wins", () => {
    const fuzzy = (s, e) => (s.code === e.code ? 1 : s.code.slice(0, 3) === e.code.slice(0, 3) ? 0.5 : 0);
    // CSC999 is listed first and loosely matches, but CSC452 is the exact one
    const r = reconcile([{ code: "CSC999" }, { code: "CSC452" }], [account[0]], { match: fuzzy, fields: [] });
    expect(r.rows[1].existing.id).toBe(1);
    expect(r.rows[0].existing).toBeNull();
  });
});
