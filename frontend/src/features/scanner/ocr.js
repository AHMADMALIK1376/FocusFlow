// Free, in-browser OCR (Tesseract.js) shared by every scanner. Loaded on
// demand so it never weighs down the rest of the app; nothing leaves the device.

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

export async function ocrImage(file, onProgress) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m) => { if (m.status === "recognizing text") onProgress(m.progress); },
  });
  try {
    // PSM 6 = read as one uniform block, row by row — keeps table rows intact.
    await worker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
    const canvas = await loadForOcr(file);
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
