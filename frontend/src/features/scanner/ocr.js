// Free, in-browser OCR (Tesseract.js) shared by every scanner. Loaded on
// demand so it never weighs down the rest of the app; nothing leaves the device.

import { wordsFromOcr } from "./tableLayout";

// Upscale + greyscale before OCR — small portal text reads far better at ~2x.
function loadForOcr(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(3, Math.max(1, 2400 / img.width));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.filter = "grayscale(1) contrast(1.2)";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
    img.src = url;
  });
}

// Text plus (optionally) word boxes from two readings, for scanners that read a
// table by position: "words" from sparse-text mode (reads wrapped cells right but
// drops lone digits) and "plainWords" from block mode (also the `text`).
export async function ocrPage(file, onProgress, withWords = false) {
  const { createWorker } = await import("tesseract.js");
  const passes = withWords ? 2 : 1;
  let pass = 0;
  const worker = await createWorker("eng", 1, {
    logger: (m) => { if (m.status === "recognizing text") onProgress((pass + m.progress) / passes); },
  });
  try {
    const canvas = await loadForOcr(file);
    // tesseract.js 7 only returns word boxes (as `blocks`) when asked.
    let words = [];
    if (withWords) {
      // PSM 11 = sparse text: every word on its own, so wrapped cells are not mixed with their neighbours.
      await worker.setParameters({ tessedit_pageseg_mode: "11", preserve_interword_spaces: "1" });
      words = wordsFromOcr((await worker.recognize(canvas, {}, { text: true, blocks: true })).data);
      pass = 1;
    }
    // PSM 6 = read as one uniform block, row by row — keeps table rows intact.
    await worker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
    const { data } = withWords ? await worker.recognize(canvas, {}, { text: true, blocks: true }) : await worker.recognize(canvas);
    return { text: data.text, words, plainWords: withWords ? wordsFromOcr(data) : [] };
  } finally {
    await worker.terminate();
  }
}

export async function ocrImage(file, onProgress) {
  return (await ocrPage(file, onProgress)).text;
}
