// Synthetic Tesseract word boxes for a portal "registered courses" table, drawn
// the way the portal does it: every cell is vertically centred in its row, so a
// wrapped title/teacher/schedule pushes the single-line cells to the middle.
// (Not real OCR output: it checks the geometry logic, not Tesseract itself.)

const COLS = { section: 20, code: 150, title: 260, credit: 570, instructor: 680, schedule: 890 };
const WIDTH = { section: 120, code: 100, title: 290, credit: 60, instructor: 190, schedule: 260 };
const CHAR = 10;
const LINE = 26;
const WORD_H = 20;

const HEADER = { section: "Section", code: "Course Code", title: "Title", credit: "Credit Hr", instructor: "Instructor", schedule: "Schedule" };

// Greedy word wrap to the column width.
function wrap(text, col) {
  const max = Math.floor(WIDTH[col] / CHAR);
  const lines = [];
  for (const w of text.split(" ")) {
    const cur = lines[lines.length - 1];
    if (cur !== undefined && (cur + " " + w).length <= max) lines[lines.length - 1] = cur + " " + w;
    else lines.push(w);
  }
  return lines;
}

function lineWords(line, col, centreY) {
  let x = COLS[col];
  return line.split(" ").map((t) => {
    const w = { text: t, bbox: { x0: x, x1: x + t.length * CHAR, y0: centreY - WORD_H / 2, y1: centreY + WORD_H / 2 } };
    x += (t.length + 1) * CHAR;
    return w;
  });
}

// rows: [{ section, code, title, credit, instructor, schedule }]
export function tableWords(rows, { header = true } = {}) {
  const words = [];
  let y = 20;
  words.push(...lineWords("Registered Courses", "title", y));
  y += 60;
  if (header) {
    Object.keys(COLS).forEach((c) => words.push(...lineWords(HEADER[c], c, y)));
    y += 50;
  }
  rows.forEach((row, ri) => {
    const cells = Object.keys(COLS).map((c) => ({ c, lines: wrap(String(row[c] || ""), c) }));
    const tall = Math.max(...cells.map((x) => x.lines.length));
    const height = tall * LINE + 24;
    const mid = y + height / 2;
    cells.forEach(({ c, lines }) => {
      lines.forEach((l, i) => {
        // small deterministic wobble, like real recognition
        const wobble = ((ri + i) % 3) - 1;
        words.push(...lineWords(l, c, mid + (i - (lines.length - 1) / 2) * LINE + wobble));
      });
    });
    y += height;
  });
  words.push(...lineWords("Total Credit Hours: 17", "title", y + 50));
  return words;
}

export const ROWS = [
  { section: "032610354", code: "CSC452", title: "COMPILER CONSTRUCTION", credit: "2", instructor: "MR. BASHARAT KAYANI", schedule: "TUE 13:15 15:20 LR26" },
  { section: "032610367", code: "CSC332L", title: "ADVANCE DATABASE MANAGEMENT SYSTEMS LAB", credit: "1", instructor: "MS. ZILL E HUMA MINHAS", schedule: "TUE 08:00 11:05 COMP LAB4" },
  { section: "032610368", code: "CSC332", title: "ADVANCE DATABASE MANAGEMENT SYSTEMS", credit: "2", instructor: "MS. TAYYABA SHEHZAD", schedule: "FRI 13:15 15:20 LR26" },
  { section: "032610371", code: "CMC381", title: "ARTIFICIAL INTELLIGENCE", credit: "3", instructor: "DR. NADEEM AKHTAR", schedule: "WED 09:35 11:05 LR33, FRI 16:25 17:55 LR29" },
  { section: "032610372", code: "CMC381L", title: "ARTIFICIAL INTELLIGENCE LAB", credit: "1", instructor: "MS. ZILL E HUMA MINHAS", schedule: "THU 08:00 11:05 COMP LAB2" },
  { section: "032610380", code: "CSC360", title: "SOFTWARE ENGINEERING", credit: "3", instructor: "MR. ALI RAZA", schedule: "MON 09:35 11:05 LR12, THU 09:35 11:05 LR12" },
  { section: "032610385", code: "CSC401", title: "HUMAN COMPUTER INTERACTION", credit: "3", instructor: "MS. SANA FATIMA", schedule: "MON 13:15 14:45 LR20, WED 13:15 14:45 LR20" },
  { section: "032610390", code: "MTH310", title: "NUMERICAL ANALYSIS", credit: "3", instructor: "DR. KHALID MAHMOOD", schedule: "TUE 09:35 11:05 LR05, THU 11:10 12:40 LR05" },
  { section: "032610395", code: "CSC420", title: "PARALLEL AND DISTRIBUTED COMPUTING", credit: "3", instructor: "MR. USMAN GHANI", schedule: "WED 11:10 12:40 LR18, FRI 11:10 12:40 LR18" },
  { section: "032610397", code: "HUM201", title: "PROFESSIONAL ETHICS", credit: "2", instructor: "TBA", schedule: "SAT 09:00 11:00 LR02" },
  { section: "032610399", code: "CSC467", title: "INTERNET OF THINGS", credit: "3", instructor: "MS. SEHER SAEED", schedule: "MON 11:10 12:40 LR29, FRI 08:00 09:30 LR26" },
];
