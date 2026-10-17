// Rebuilds a portal table from OCR word boxes, so a row whose cells wrap onto
// several lines (and are vertically centred) is read as ONE row. Pure and free:
// it only looks at where each word sits on the page. Returns tab-separated
// text for parseTimetable, or null when it cannot find the table with
// confidence (callers then use the plain line-by-line text).

// Header words -> the column they name.
const HEADER_COLUMN = [
  [/^section$/, "section"],
  [/^(course|code|coursecode)$/, "code"],
  [/^title$/, "title"],
  [/^(credit|credits|hr|hrs)$/, "credit"],
  [/^instructor$/, "instructor"],
  [/^schedule$/, "schedule"],
];
const SECTION_RE = /^\d{6,}$/;
const CODE_RE = /^[A-Z]{2,5}-?\d{3,4}L?$/i;

const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

// Tesseract.js 7 nests words in blocks > paragraphs > lines; older versions
// give a flat `words` list. Either way: [{ text, bbox:{x0,y0,x1,y1} }].
export function wordsFromOcr(data) {
  if (!data) return [];
  let words = [];
  if (Array.isArray(data.words)) words = data.words;
  else {
    for (const b of data.blocks || [])
      for (const p of b.paragraphs || [])
        for (const l of p.lines || []) words.push(...(l.words || []));
  }
  return words.filter((w) => w && w.bbox && String(w.text || "").trim());
}

function columnOf(text) {
  const t = text.toLowerCase().replace(/[^a-z]/g, "");
  const hit = HEADER_COLUMN.find(([re]) => re.test(t));
  return hit ? hit[1] : null;
}

// Words of one cell: top to bottom, and left to right along each visual line.
function readingOrder(items, lineH) {
  const sorted = [...items].sort((a, b) => a.cy - b.cy);
  const lines = [];
  for (const w of sorted) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(w.cy - line.cy) < lineH * 0.5) {
      line.words.push(w);
      line.cy = line.words.reduce((s, x) => s + x.cy, 0) / line.words.length;
    } else lines.push({ cy: w.cy, words: [w] });
  }
  return lines.map((l) => l.words.sort((a, b) => a.x0 - b.x0).map((w) => w.text).join(" ")).join(" ");
}

/**
 * @param {Array<{text:string,bbox:{x0,y0,x1,y1}}>} rawWords
 * @returns {string|null} one tab-separated line per table row
 */
export function rebuildRows(rawWords) {
  const words = (rawWords || [])
    .map((w) => ({
      text: String(w.text || "").trim(),
      x0: w.bbox.x0,
      x1: w.bbox.x1,
      cy: (w.bbox.y0 + w.bbox.y1) / 2,
      h: w.bbox.y1 - w.bbox.y0,
    }))
    .filter((w) => w.text);
  if (words.length < 8) return null;
  const lineH = median(words.map((w) => w.h)) * 1.3 || 1;

  // 1. The header line is the visual line naming the most table columns.
  const tagged = words.map((w) => ({ ...w, col: columnOf(w.text) })).filter((w) => w.col);
  let header = null;
  for (const seed of tagged) {
    const line = tagged.filter((w) => Math.abs(w.cy - seed.cy) < lineH * 0.5);
    const names = new Set(line.map((w) => w.col));
    if (names.size >= 4 && (!header || names.size > header.names)) header = { names: names.size, line, cy: seed.cy };
  }
  if (!header) return null;

  // 2. Column spans from the header words; a boundary sits midway in the gap
  // (never past the next header's left edge, if two headers overlap).
  const spans = {};
  for (const w of header.line) {
    const s = spans[w.col] || (spans[w.col] = { col: w.col, x0: w.x0, x1: w.x1 });
    s.x0 = Math.min(s.x0, w.x0);
    s.x1 = Math.max(s.x1, w.x1);
  }
  const cols = Object.values(spans).sort((a, b) => a.x0 - b.x0);
  const bounds = cols.map((c, i) => (i === 0 ? -Infinity : Math.min((cols[i - 1].x1 + c.x0) / 2, c.x0 - 1)));
  const colIndex = (x) => {
    let idx = 0;
    bounds.forEach((b, i) => { if (x >= b) idx = i; });
    return idx;
  };

  // 3. Everything on or above the header line is not table body.
  const headerWords = new Set(header.line);
  const body = words.filter((w) => w.cy > header.cy + lineH * 0.5 && !headerWords.has(w));
  const secIdx = cols.findIndex((c) => c.col === "section");
  const codeIdx = cols.findIndex((c) => c.col === "code");

  // 4. One anchor per row: its section number or course code. Both sit on the
  // same line when a row is vertically centred, so close ones are merged.
  const marks = body
    .filter((w) => {
      const ci = colIndex(w.x0);
      return (ci === secIdx && SECTION_RE.test(w.text)) || (ci === codeIdx && CODE_RE.test(w.text));
    })
    .sort((a, b) => a.cy - b.cy);
  const anchors = [];
  for (const m of marks) {
    const last = anchors[anchors.length - 1];
    if (last && m.cy - last.cy < lineH * 0.75) {
      last.n += 1;
      last.cy += (m.cy - last.cy) / last.n;
    } else anchors.push({ cy: m.cy, n: 1 });
  }
  if (!anchors.length) return null;

  // 5. Words past the table's last row (footers, totals) are left out.
  const pitch = anchors.length > 1 ? (anchors[anchors.length - 1].cy - anchors[0].cy) / (anchors.length - 1) : Infinity;
  const limit = anchors[anchors.length - 1].cy + Math.max(pitch / 2, 2.5 * lineH);
  const edges = anchors.slice(1).map((a, i) => (a.cy + anchors[i].cy) / 2);

  // 6. Each word goes to the nearest row (above the first anchor -> first row).
  const rows = anchors.map(() => cols.map(() => []));
  for (const w of body) {
    if (w.cy > limit) continue;
    const r = edges.filter((e) => w.cy >= e).length;
    rows[r][colIndex(w.x0)].push(w);
  }
  return rows.map((cells) => cells.map((c) => readingOrder(c, lineH)).join("\t")).join("\n");
}
