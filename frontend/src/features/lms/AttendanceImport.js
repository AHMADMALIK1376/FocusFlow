import React, { useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { lmsAPI } from "../../services/api";
import { Button, Select } from "../../components/ui";
import { useSubjects } from "../subjects/useSubjects";

// "3 new, 1 changed, 4 already the same" for the answer of the import.
export function importSummary(r) {
  if (!r) return "";
  const bits = [];
  if (r.added) bits.push(`${r.added} new`);
  if (r.changed) bits.push(`${r.changed} changed to match the LMS`);
  if (r.same) bits.push(`${r.same} already the same`);
  return bits.length ? bits.join(", ") : "Nothing to change.";
}

// The LMS does not hand Present/Absent to other apps, so the student copies the course's Attendance page from the LMS and pastes it here.
// Check first (nothing is saved), then import.
export default function AttendanceImport() {
  const { subjects } = useSubjects();
  const [subjectId, setSubjectId] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const reset = () => { setPreview(null); setNote(""); setError(""); };

  async function run(dryRun) {
    setBusy(true); setError(""); setNote("");
    try {
      const r = await lmsAPI.importAttendance(subjectId, text, dryRun);
      if (dryRun) {
        setPreview(r);
      } else {
        setPreview(null);
        setText("");
        setNote(`Imported: ${importSummary(r)}.`);
      }
    } catch (e) {
      setPreview(null);
      setError(e.message || "Could not read that page.");
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(subjectId) && text.trim().length > 0;
  const nothingToDo = preview && !preview.added && !preview.changed;

  return (
    <div className="space-y-3 text-sm text-ink">
      <h3 className="flex items-center gap-2 font-black uppercase tracking-wider text-sm">
        <ClipboardPaste size={16} aria-hidden="true" /> Bring in my attendance
      </h3>
      <p className="text-muted leading-relaxed">
        Your university's LMS does not allow other apps to read who was present, so FocusFlow cannot fetch your attendance by itself. You can bring it in
        yourself, once per subject, in a minute. Everything else (subjects, assignments, quizzes, files) syncs on its own.
      </p>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer font-bold text-ink">How to bring in my attendance</summary>
        <ol className="mt-2 list-decimal pl-5 space-y-1">
          <li>In the LMS, open the course, then Attendance.</li>
          <li>Select the whole page and copy it (Ctrl+A then Ctrl+C; on a phone: touch and hold, Select all, Copy).</li>
          <li>Come back here, choose the subject, paste, press Check, then Import.</li>
        </ol>
      </details>
      <label className="block">
        <span className="block text-xs font-bold text-muted mb-1">Subject</span>
        <Select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); reset(); }} aria-label="Subject">
          <option value="">Choose a subject</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </label>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); reset(); }}
        rows={4}
        aria-label="Attendance page text"
        placeholder="Paste the Attendance page here"
        className="w-full rounded-token-md bg-surface-2 p-2 text-ink text-xs"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="soft" size="sm" disabled={!ready || busy} onClick={() => run(true)}>Check</Button>
        <Button variant="primary" size="sm" disabled={!preview || nothingToDo || busy} onClick={() => run(false)}>Import</Button>
      </div>
      {preview && (
        <p role="status" className="font-bold text-brand">
          Found {preview.found} marked {preview.found === 1 ? "class" : "classes"}: {importSummary(preview)}.
        </p>
      )}
      {note && <p role="status" className="font-bold text-brand">{note}</p>}
      {error && <p role="alert" className="font-bold text-focus">{error}</p>}
    </div>
  );
}
