import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImageUp, ClipboardPaste, Plus, Trash2, ArrowLeft, ScanText } from "lucide-react";
import { Button, Input, Textarea, Select, Field, Modal, SegmentedControl, Checkbox, Badge } from "../../components/ui";
import { subjectAPI } from "../../services/api";
import { parseTimetable, assignColors } from "./parseTimetable";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

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

// Free, in-browser OCR (Tesseract.js). Loaded on demand so it never weighs
// down the rest of the app.
async function ocrImage(file, onProgress) {
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

export default function TimetableImportModal({ open, onClose, existing = [], onImported }) {
  const [step, setStep] = useState("input"); // input | review
  const [mode, setMode] = useState("image");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState([]);
  const fileRef = useRef(null);

  const existingCodes = new Set(existing.map((s) => (s.code || "").toUpperCase()).filter(Boolean));

  useEffect(() => {
    if (!open) return;
    setStep("input"); setFile(null); setPreview(null); setText("");
    setError(""); setProgress(0); setRows([]); setTerm("");
  }, [open]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pickFile = useCallback((f) => {
    if (!f) return;
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  // Ctrl+V a screenshot straight into the image tab.
  useEffect(() => {
    if (!open || step !== "input" || mode !== "image") return undefined;
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
      if (item) pickFile(item.getAsFile());
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, step, mode, pickFile]);

  function toReview(rawText) {
    const parsed = parseTimetable(rawText);
    if (!parsed.length) {
      setError("Couldn't find any courses. Make sure the course codes (e.g. CSC452) and class times are visible, or try pasting the text instead.");
      return;
    }
    setRows(assignColors(parsed, existing.length).map((c) => ({
      ...c,
      include: !existingCodes.has(c.code.toUpperCase()),
      duplicate: existingCodes.has(c.code.toUpperCase()),
    })));
    setStep("review");
  }

  async function readInput() {
    setError("");
    if (mode === "paste") return toReview(text);
    if (!file) return setError("Choose or paste a screenshot first.");
    setBusy(true); setProgress(0);
    try {
      toReview(await ocrImage(file, setProgress));
    } catch (e) {
      setError(e.message || "Text recognition failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const setRow = (i, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const setSlot = (i, j, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i
    ? { ...r, schedule: r.schedule.map((s, sj) => (sj === j ? { ...s, [k]: v } : s)) } : r)));
  const addSlot = (i) => setRows((rs) => rs.map((r, idx) => (idx === i
    ? { ...r, schedule: [...r.schedule, { day: "Monday", start: "", end: "", room: "" }] } : r)));
  const removeSlot = (i, j) => setRows((rs) => rs.map((r, idx) => (idx === i
    ? { ...r, schedule: r.schedule.filter((_, sj) => sj !== j) } : r)));

  const selected = rows.filter((r) => r.include && r.name.trim());

  async function importAll() {
    setBusy(true); setError("");
    const failed = [];
    for (const r of selected) {
      try {
        await subjectAPI.create({
          name: r.name.trim(),
          code: r.code.trim() || null,
          color: r.color,
          instructor: r.instructor.trim() || null,
          creditHours: Number(r.creditHours) || 0,
          term: term.trim() || null,
          targetGrade: null,
          schedule: r.schedule.filter((s) => s.day && s.start),
        });
      } catch {
        failed.push(r.code || r.name);
      }
    }
    setBusy(false);
    await onImported?.();
    if (failed.length) {
      setError(`Couldn't import: ${failed.join(", ")}. The rest were added.`);
      setRows((rs) => rs.filter((r) => failed.includes(r.code || r.name)));
    } else {
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={step === "input" ? "Import timetable" : "Review courses"}
      maxWidthClassName={step === "input" ? "max-w-lg" : "max-w-3xl"}
      noScrollbar
      showClose={!busy}
      className="p-5"
    >
      {step === "input" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Add all your courses at once from your university portal. Nothing is sent to an AI: the text is read on your device.
          </p>
          <SegmentedControl
            value={mode}
            onChange={(v) => { setMode(v); setError(""); }}
            options={[
              { value: "image", label: <span className="inline-flex items-center gap-1.5"><ImageUp size={15} /> Screenshot</span> },
              { value: "paste", label: <span className="inline-flex items-center gap-1.5"><ClipboardPaste size={15} /> Paste text</span> },
            ]}
          />

          {mode === "image" ? (
            <div
              onClick={() => !busy && fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
              className="cursor-pointer rounded-token-lg border-2 border-dashed border-[rgb(var(--ink)/0.18)] hover:border-[rgb(var(--brand)/0.6)] p-4 text-center transition-colors"
            >
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
              {preview ? (
                <img src={preview} alt="Timetable screenshot" className="max-h-56 mx-auto rounded-token-md" />
              ) : (
                <div className="py-6">
                  <ImageUp size={30} className="mx-auto text-muted mb-2" />
                  <p className="text-sm font-bold text-ink">Tap to choose a screenshot</p>
                  <p className="text-xs text-muted mt-1">or drag it here, or press Ctrl+V</p>
                </div>
              )}
            </div>
          ) : (
            <Field label="Paste your registered-courses table" hint="On the portal, select the whole table, copy it, and paste it here. This is the most accurate option.">
              <Textarea
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"032610354\tCSC452\tCOMPILER CONSTRUCTION\t2\tMR. ...\tTUE 01:15 03:20 LR26"}
                className="font-mono text-xs"
              />
            </Field>
          )}

          {busy && (
            <div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full bg-grad-hero transition-all" style={{ width: `${Math.max(5, progress * 100)}%` }} />
              </div>
              <p className="text-xs text-muted mt-1.5">Reading text… the first time takes a little longer while the reader downloads.</p>
            </div>
          )}
          {error && <p className="text-sm text-focus">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button
              variant="primary"
              onClick={readInput}
              disabled={busy || (mode === "image" ? !file : !text.trim())}
              className="gap-1.5"
            >
              <ScanText size={16} /> {busy ? "Reading…" : "Find courses"}
            </Button>
          </div>
        </div>
      ) : (
        // Only the course list scrolls; the header and buttons stay inside the frame.
        <div className="flex flex-col gap-3 max-h-[calc(85vh-6.5rem)]">
          <p className="text-sm text-muted shrink-0">
            Found {rows.length} course{rows.length === 1 ? "" : "s"}. Check names, times and rooms. Screenshots can misread a letter or two.
            Times are 24-hour; portal times without AM/PM were read as 8–11 morning, 12–7 afternoon.
          </p>
          <div className="shrink-0">
            <Field label="Term (applies to all)">
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. Fall 2026" className="!py-2.5 !px-4 text-sm" />
            </Field>
          </div>

          <div className="space-y-2.5 overflow-y-auto min-h-0 flex-1 ff-modal-no-scrollbar -mx-1 px-1 pb-1">
            {rows.map((r, i) => (
              <div
                key={i}
                className={`rounded-token-lg p-3 border border-[rgb(var(--ink)/0.1)] transition-opacity ${r.include ? "" : "opacity-50"}`}
                style={{ borderLeft: `5px solid ${r.color}` }}
              >
                <div className="flex items-start gap-2.5">
                  <Checkbox checked={r.include} onChange={(v) => setRow(i, "include", v)} size={22} label={`Import ${r.code}`} className="mt-2" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="grid grid-cols-[6.5rem_1fr_4rem] gap-2">
                      <Input value={r.code} onChange={(e) => setRow(i, "code", e.target.value)} placeholder="Code" className="!py-2 !px-3 text-sm font-bold" />
                      <Input value={r.name} onChange={(e) => setRow(i, "name", e.target.value)} placeholder="Course name" className="!py-2 !px-3 text-sm" />
                      <Input type="number" min="0" step="0.5" value={r.creditHours ?? ""} onChange={(e) => setRow(i, "creditHours", e.target.value)} title="Credit hours" className="!py-2 !px-2 text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input value={r.instructor} onChange={(e) => setRow(i, "instructor", e.target.value)} placeholder="Instructor (TBA)" className="!py-2 !px-3 text-sm flex-1" />
                      {r.duplicate && <Badge tone="warn">Already added</Badge>}
                    </div>
                    {r.schedule.map((s, j) => (
                      <div key={j} className="grid grid-cols-[4.5rem_1fr_1fr_1fr_auto] gap-1.5 items-center">
                        <Select value={s.day} onChange={(e) => setSlot(i, j, "day", e.target.value)} className="!py-1.5 !px-2 text-sm">
                          {DAYS.map((d) => <option key={d} value={d}>{DAY_SHORT[d]}</option>)}
                        </Select>
                        <Input type="time" value={s.start} onChange={(e) => setSlot(i, j, "start", e.target.value)} className="!py-1.5 !px-2 text-sm" />
                        <Input type="time" value={s.end} onChange={(e) => setSlot(i, j, "end", e.target.value)} className="!py-1.5 !px-2 text-sm" />
                        <Input value={s.room} onChange={(e) => setSlot(i, j, "room", e.target.value)} placeholder="Room" className="!py-1.5 !px-2 text-sm" />
                        <button onClick={() => removeSlot(i, j)} className="p-1.5 text-muted hover:text-focus" title="Remove slot"><Trash2 size={15} /></button>
                      </div>
                    ))}
                    <button onClick={() => addSlot(i)} className="text-xs font-bold text-muted hover:text-ink inline-flex items-center gap-1">
                      <Plus size={13} /> Add class time
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-focus shrink-0">{error}</p>}

          <div className="flex justify-between gap-2 shrink-0 pt-3 border-t border-[rgb(var(--ink)/0.08)]">
            <Button variant="ghost" onClick={() => { setStep("input"); setError(""); }} disabled={busy} className="gap-1.5">
              <ArrowLeft size={16} /> Back
            </Button>
            <Button variant="primary" onClick={importAll} disabled={busy || !selected.length}>
              {busy ? "Importing…" : `Import ${selected.length} subject${selected.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
