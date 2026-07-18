// A digital HH:MM:SS readout where every digit is drawn as a 3x5 dot-matrix
// of small rounded cells — the same visual language as the attendance
// heatmap (empty = faint ink tint, lit = solid brand) — instead of a plain
// numeric font. Used only while a session is actively counting down.
import React from "react";

const CELL = 7;
const GAP = 2;

// 1 = lit cell, 0 = unlit. 5 rows x 3 cols per digit.
const DIGIT_PATTERNS = {
  "0": [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  "1": [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
  "2": [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
  "3": [[1,1,1],[0,0,1],[1,1,1],[0,0,1],[1,1,1]],
  "4": [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
  "5": [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  "6": [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
  "7": [[1,1,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
  "8": [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
  "9": [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
};
const COLON = [[0],[1],[0],[1],[0]];

function Glyph({ pattern }) {
  const cols = pattern[0].length;
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${cols}, ${CELL}px)`, gridAutoRows: `${CELL}px`, gap: GAP }}
    >
      {pattern.flat().map((on, i) => (
        <div
          key={i}
          className={`rounded-sm transition-colors duration-300 ${on ? "bg-brand" : "bg-[rgb(var(--ink)/0.06)]"}`}
        />
      ))}
    </div>
  );
}

export default function DigitMatrixClock({ hours = 0, minutes = 0, seconds = 0 }) {
  const digits = `${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}${String(seconds).padStart(2, "0")}`.split("");
  return (
    <div className="flex items-end" style={{ gap: 6 }}>
      <Glyph pattern={DIGIT_PATTERNS[digits[0]]} />
      <Glyph pattern={DIGIT_PATTERNS[digits[1]]} />
      <Glyph pattern={COLON} />
      <Glyph pattern={DIGIT_PATTERNS[digits[2]]} />
      <Glyph pattern={DIGIT_PATTERNS[digits[3]]} />
      <Glyph pattern={COLON} />
      <Glyph pattern={DIGIT_PATTERNS[digits[4]]} />
      <Glyph pattern={DIGIT_PATTERNS[digits[5]]} />
    </div>
  );
}
