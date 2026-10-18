import { faceTiles, isCompact, surname, COMPACT_BELOW, stickerTint, reconcileAssign, STICKER_INDEX, CENTRE, WARN_BELOW } from "./cubeFaces";

const sub = (extra = {}) => ({
  id: "s1", code: "CSC312", name: "Web Engineering", color: "#E86562", instructor: "Dr Sana", creditHours: 3,
  schedule: [{ day: "Wednesday", start: "13:15", end: "14:45", room: "LR26" }, { day: "Monday", start: "11:10", end: "12:40", room: "LR26" }], ...extra,
});
const val = (tiles, key) => tiles.find((t) => t.key === key);

describe("faceTiles", () => {
  const att = { s1: { attended: 6, total: 8, pct: 75 } };
  it("gives nine tiles with the name tag in the middle and the eight facts around it, in reading order", () => {
    const tiles = faceTiles(sub(), att);
    expect(tiles).toHaveLength(9);
    expect(tiles[CENTRE]).toMatchObject({ title: true, code: "CSC312", value: "Web Engineering" });
    expect(tiles.filter((t) => !t.title).map((t) => t.key)).toEqual(["type", "credits", "teacher", "room", "first", "second", "attendance", "attended"]);
    expect(tiles.map((t) => t.key).indexOf("title")).toBe(4);
  });
  it("fills every fact for a theory subject with two classes", () => {
    const t = faceTiles(sub(), att);
    expect(val(t, "type").value).toBe("Theory");
    expect(val(t, "credits").value).toBe("3 credits");
    expect(val(t, "teacher").value).toBe("Dr Sana");
    expect(val(t, "room").value).toBe("LR26"); // one room, said once
    expect(val(t, "first")).toMatchObject({ label: "Class 1", value: "Mon 11:10 AM" }); // earliest in the week, not first in the list
    expect(val(t, "second")).toMatchObject({ label: "Class 2", value: "Wed 1:15 PM" });
    expect(val(t, "attendance")).toMatchObject({ value: "75%", big: true, warn: false });
    expect(val(t, "attended").value).toBe("6 of 8 attended");
  });
  it("says Lab for a lab, 1 credit for one, and joins different rooms", () => {
    const t = faceTiles(sub({ name: "Physics Lab", code: "PHY1L", creditHours: 1, schedule: [{ day: "Friday", start: "09:00", end: "11:00", room: "L1" }, { day: "Monday", start: "09:00", end: "11:00", room: "L2" }] }), att);
    expect(val(t, "type").value).toBe("Lab");
    expect(val(t, "credits").value).toBe("1 credit");
    expect(val(t, "room").value).toBe("L2, L1");
  });
  it("says TBA without a teacher or room, and Not set without credits", () => {
    const t = faceTiles(sub({ instructor: "  ", creditHours: 0, schedule: [{ day: "Monday", start: "11:10", end: "12:40" }] }), att);
    expect(val(t, "teacher").value).toBe("TBA");
    expect(val(t, "room").value).toBe("TBA");
    expect(val(t, "credits").value).toBe("Not set");
  });
  it("with one class shows its end time, or '1 class a week' without an end, and with none says so", () => {
    expect(val(faceTiles(sub({ schedule: [{ day: "Monday", start: "11:10", end: "12:40" }] }), att), "second")).toMatchObject({ label: "Ends", value: "12:40 PM" });
    expect(val(faceTiles(sub({ schedule: [{ day: "Monday", start: "11:10" }] }), att), "second")).toMatchObject({ label: "Weekly", value: "1 class a week" });
    const none = faceTiles(sub({ schedule: [] }), att);
    expect(val(none, "first").value).toBe("No class times");
    expect(val(none, "second").value).toBe("No classes");
    expect(val(none, "room").value).toBe("TBA");
  });
  it("marks attendance under the warning line, and says so when there is none", () => {
    expect(WARN_BELOW).toBe(75);
    expect(val(faceTiles(sub(), { s1: { attended: 3, total: 8, pct: 37.5 } }), "attendance")).toMatchObject({ value: "38%", warn: true });
    for (const a of [undefined, {}, { s1: { attended: 0, total: 0, pct: null } }]) {
      const t = faceTiles(sub(), a);
      expect(val(t, "attendance")).toMatchObject({ value: "No attendance" });
      expect(val(t, "attendance").warn).toBeUndefined();
      expect(val(t, "attended").value).toBe("Nothing logged");
    }
  });
  it("also takes the subject's own record instead of the whole map", () => {
    expect(val(faceTiles(sub(), { attended: 6, total: 8, pct: 75 }), "attended").value).toBe("6 of 8 attended");
  });
  it("copes with no code", () => {
    expect(faceTiles(sub({ code: "" }), att)[CENTRE].code).toBe("");
  });
});

describe("the sticker places", () => {
  it("maps all 54 stickers to a face and a reading index, nine per face with the centre fourth", () => {
    expect(Object.keys(STICKER_INDEX)).toHaveLength(54);
    expect(STICKER_INDEX["0,0,1|front"]).toEqual({ face: "front", index: 4 });
    expect(STICKER_INDEX["-1,-1,1|front"]).toEqual({ face: "front", index: 0 });
    expect(STICKER_INDEX["1,1,1|front"]).toEqual({ face: "front", index: 8 });
    const per = {};
    Object.values(STICKER_INDEX).forEach((v) => { (per[v.face] = per[v.face] || new Set()).add(v.index); });
    Object.values(per).forEach((set) => expect([...set].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]));
  });
});

describe("stickerTint", () => {
  const channels = (css) => css.match(/\d+/g).map(Number);
  it("is a light tint of the colour, different from sticker to sticker", () => {
    const seen = new Set();
    for (let i = 0; i < 9; i++) {
      const c = stickerTint("#E86562", i);
      seen.add(c);
      const [r, g, b] = channels(c);
      expect(Math.min(r, g, b)).toBeGreaterThan(190); // light: never dark
      expect(r).toBeGreaterThanOrEqual(g);
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });
  it("tints a dark colour light too, and the centre is the strongest", () => {
    for (let i = 0; i < 9; i++) expect(Math.min(...channels(stickerTint("#000000", i)))).toBeGreaterThanOrEqual(200);
    const lum = (i) => channels(stickerTint("#2563EB", i)).reduce((a, b) => a + b, 0);
    for (let i = 0; i < 9; i++) if (i !== CENTRE) expect(lum(i)).toBeGreaterThan(lum(CENTRE));
  });
  it("falls back to the default colour for a missing one", () => {
    expect(channels(stickerTint(undefined, 0))).toHaveLength(3);
  });
});

describe("reconcileAssign", () => {
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
  it("starts with the first six subjects", () => {
    expect(reconcileAssign([], ids)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
  it("keeps the subjects already on faces where they are", () => {
    expect(reconcileAssign(["a", "g", "c", "d", "e", "f"], ids)).toEqual(["a", "g", "c", "d", "e", "f"]);
  });
  it("replaces a deleted subject with the next unused one, and never repeats one", () => {
    expect(reconcileAssign(["a", "x", "c", "a", "e", "f"], ids)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
  it("leaves faces empty when there are fewer than six subjects", () => {
    expect(reconcileAssign([], ["a", "b"])).toEqual(["a", "b", null, null, null, null]);
    expect(reconcileAssign([], [])).toEqual([null, null, null, null, null, null]);
  });
});

describe("compact tiles for small blocks", () => {
  const att = { s1: { attended: 5, total: 6, pct: 83.3 } };
  const t = (extra) => faceTiles(sub(extra), att, true);
  it("chooses the short forms under about 80px a block", () => {
    expect(COMPACT_BELOW).toBe(80);
    expect(isCompact(69)).toBe(true);
    expect(isCompact(80)).toBe(false);
    expect(isCompact(90)).toBe(false);
    expect(isCompact(0)).toBe(false); // not measured yet
  });
  it("shortens a teacher to the surname, keeping a title", () => {
    expect(surname("Ms. Seher Saeed")).toBe("Ms. Saeed");
    expect(surname("Seher Saeed")).toBe("Saeed");
    expect(surname("Dr. A")).toBe("Dr. A");
    expect(surname("Latif")).toBe("Latif");
    expect(surname("")).toBe("");
  });
  it("uses one short form for every value", () => {
    const v = t({ instructor: "Ms. Seher Latif", schedule: [{ day: "Wednesday", start: "13:15", end: "14:45", room: "LR26" }, { day: "Monday", start: "11:10", end: "12:40", room: "LR27" }] });
    const val2 = (k) => val(v, k).value;
    expect(val2("credits")).toBe("3 cr");
    expect(val2("teacher")).toBe("Ms. Latif");
    expect(val2("room")).toBe("LR27 +1");
    expect(val2("first")).toBe("Mon 11:10a");
    expect(val2("second")).toBe("Wed 1:15p");
    expect(val2("attendance")).toBe("83%");
    expect(val2("attended")).toBe("5/6");
    expect(val2("type")).toBe("Theory");
    expect(v).toHaveLength(9);
  });
  it("short forms for one class, none, and no attendance; the full forms are unchanged", () => {
    expect(val(t({ schedule: [{ day: "Monday", start: "11:10", end: "13:14", room: "A" }] }), "second").value).toBe("Ends 1:14p");
    expect(val(t({ schedule: [{ day: "Monday", start: "11:10" }] }), "second").value).toBe("1 a week");
    const none = faceTiles(sub({ schedule: [], instructor: "", creditHours: 0 }), undefined, true);
    expect(val(none, "first").value).toBe("No class");
    expect(val(none, "teacher").value).toBe("TBA");
    expect(val(none, "attendance").value).toBe("None");
    expect(val(none, "attended").value).toBe("--");
    expect(val(faceTiles(sub(), att), "attended").value).toBe("5 of 6 attended");
  });
  it("every fact tile names an icon", () => {
    faceTiles(sub(), att).filter((x) => !x.title).forEach((x) => expect(x.icon).toBeTruthy());
  });
});
