import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageUp, ClipboardPaste, ArrowLeft, ScanText, AlertTriangle } from "lucide-react";
import { Button, Textarea, Field, Modal, SegmentedControl, Checkbox, Badge } from "../../components/ui";
import { ocrImage } from "./ocr";
import { reconcile } from "./reconcile";

// One scanner flow for every page (timetable, date sheet, marks, assignments).
// A `kind` (see ./kinds) says how to read the text and how to save each row.
// What's scanned is compared with what's already in the account:
//   • rows that already match are left alone,
//   • rows that match but differ update only the fields that differ,
//   • new rows are added,
//   • if most of the scan doesn't match at all, the student is asked whether
//     to replace their current data with it.

const STATUS = {
  new: { tone: "success", label: "New", border: "border-l-success" },
  changed: { tone: "warn", label: "Update", border: "border-l-warn" },
  same: { tone: "muted", label: "No change", border: "border-l-[rgb(var(--ink)/0.15)]" },
};

const count = (n, [one, many]) => `${n} ${n === 1 ? one : many}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function ReviewRow({ row, kind, ctx, onInclude, onOpen, update }) {
  const st = STATUS[row.status];
  const editable = row.status !== "same" || row.open;
  const set = (k, v) => update((d) => ({ ...d, [k]: v }));
  return (
    <div
      className={`rounded-token-lg p-3 border border-[rgb(var(--ink)/0.1)] border-l-[5px] ${st.border} transition-opacity ${
        row.status !== "same" && !(row.include && row.valid) ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        {row.status === "same" ? (
          <span className="w-[22px] shrink-0" />
        ) : (
          <Checkbox
            checked={row.include && row.valid}
            onChange={(v) => row.valid && onInclude(v)}
            size={22}
            label={`Save ${kind.name(row.data, ctx)}`}
            className="mt-0.5"
          />
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge tone={st.tone} className="!px-2 !py-0.5 shrink-0">{st.label}</Badge>
            <span className="text-sm font-bold text-ink truncate">{kind.name(row.data, ctx)}</span>
            {row.status === "same" && (
              <button type="button" onClick={() => onOpen(!row.open)} className="ml-auto shrink-0 text-xs font-bold text-muted hover:text-ink">
                {row.open ? "Hide" : "Edit"}
              </button>
            )}
          </div>
          {row.status !== "same" && !row.valid && <p className="text-xs text-focus">{kind.invalidHint(row.data)}</p>}
          {row.changes.length > 0 && (
            <ul className="text-xs space-y-0.5 rounded-token-md bg-warn/10 px-2.5 py-1.5">
              {row.changes.map((c) => (
                <li key={c.key} className="break-words">
                  <span className="font-bold text-ink">{c.label}:</span>{" "}
                  <span className="text-muted line-through">{c.from || "—"}</span> → <span className="font-medium text-ink">{c.to}</span>
                </li>
              ))}
            </ul>
          )}
          {editable && <kind.Editor data={row.data} set={set} update={update} ctx={ctx} status={row.status} />}
        </div>
      </div>
    </div>
  );
}

// Text the scanner saw but could not turn into anything: shown, never dropped.
function UnreadLines({ lines, title, open = false }) {
  if (!lines.length) return null;
  return (
    <details open={open} className="rounded-token-md bg-[rgb(var(--ink)/0.04)] px-3 py-2 text-xs">
      <summary className="cursor-pointer font-bold text-muted">{title}</summary>
      <ul className="mt-1.5 space-y-0.5 text-muted font-mono break-words">
        {lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
    </details>
  );
}

export default function ScanImportModal({ open, onClose, kind, ctx, onDone }) {
  const [step, setStep] = useState("input"); // input | decide | review
  const [mode, setMode] = useState("image");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]); // [{ data, include, open }]
  const [replace, setReplace] = useState(false);
  const [unread, setUnread] = useState([]); // lines on the page the scanner could not use
  const [opts, setOpts] = useState(kind.defaultOptions || {});
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStep("input"); setFile(null); setPreview(null); setText("");
    setError(""); setProgress(0); setRows([]); setReplace(false); setUnread([]);
    setOpts(kind.defaultOptions || {});
  }, [open, kind]);

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

  // Compared live, so fixing a misread code in the review re-matches the row.
  const datas = useMemo(() => rows.map((r) => r.data), [rows]);
  const fields = useMemo(() => kind.fields(ctx), [kind, ctx]);
  const compare = useCallback(
    (list) => {
      const scope = kind.existing(ctx, list, opts);
      return { scope, ...reconcile(list, scope, { match: (s, e) => kind.match(s, e, ctx), fields }) };
    },
    [kind, ctx, opts, fields]
  );
  const rec = useMemo(() => compare(datas), [compare, datas]);

  function toReview(raw) {
    const parsed = kind.parse(raw, ctx, opts);
    // Whatever was not turned into a row stays visible, so nothing vanishes silently.
    const leftover = parsed.unread?.length ? parsed.unread : parsed.length ? [] : String(raw).split("\n").map((l) => l.trim()).filter(Boolean);
    setUnread(leftover.slice(0, 15));
    if (!parsed.length) {
      setError(kind.emptyError);
      return;
    }
    setRows(parsed.map((data) => ({ data, include: true, open: false })));
    setReplace(false);
    setStep(compare(parsed).mostlyDifferent ? "decide" : "review");
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

  const updateRow = (i, patch) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const updateData = (i, fn) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, data: fn(r.data) } : r)));
  const updateAll = (fn) => setRows((rs) => rs.map((r) => ({ ...r, data: fn(r.data) })));

  const items = rec.rows.map((r, i) => ({ ...r, i, include: rows[i]?.include, open: rows[i]?.open, valid: kind.isValid(r.data, ctx) }));
  const creates = items.filter((r) => r.status === "new" && r.include && r.valid);
  const updates = items.filter((r) => r.status === "changed" && r.include && r.valid);
  const removes = replace ? rec.unmatched.filter((e) => !kind.removable || kind.removable(e)) : [];
  const tally = { new: 0, changed: 0, same: 0 };
  items.forEach((r) => { tally[r.status] += 1; });

  async function apply() {
    setBusy(true); setError("");
    const failed = [];
    let reason = "";
    const attempt = async (fn, what) => {
      try { await fn(); return true; } catch (e) { failed.push(what); reason = reason || e.message; return false; }
    };
    const done = { created: 0, updated: 0, removed: 0 };
    for (const r of creates) if (await attempt(() => kind.create(r.data, ctx, opts), kind.name(r.data, ctx))) done.created += 1;
    for (const r of updates) if (await attempt(() => kind.update(r.existing, r.data, r.changes, ctx, opts), kind.name(r.data, ctx))) done.updated += 1;
    // Old data is only cleared once everything new is safely saved.
    if (!failed.length) {
      for (const e of removes) if (await attempt(() => kind.remove(e, ctx, opts), kind.label(e, ctx))) done.removed += 1;
    }
    setBusy(false);
    const parts = [];
    if (done.created) parts.push(`${done.created} added`);
    if (done.updated) parts.push(`${done.updated} updated`);
    if (done.removed) parts.push(`${done.removed} ${kind.removedWord}`);
    await onDone?.(parts.length ? `${cap(kind.noun[1])}: ${parts.join(", ")}` : "");
    if (failed.length) {
      const kept = removes.length && !done.removed ? " Nothing old was removed yet." : "";
      setError(`Couldn't save ${failed.join(", ")}${reason ? ` (${reason})` : ""}. ${parts.length ? `Everything else was saved.${kept}` : "Nothing was changed."} Press the button again to retry.`);
    } else {
      onClose();
    }
  }

  const actions = [];
  if (creates.length) actions.push(`Add ${creates.length}`);
  if (updates.length) actions.push(`Update ${updates.length}`);
  if (removes.length) actions.push(kind.removeButton(removes.length));

  const title = step === "input" ? kind.title : step === "decide" ? kind.decideTitle : kind.reviewTitle;

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      maxWidthClassName={step === "review" ? "max-w-3xl" : "max-w-lg"}
      noScrollbar
      showClose={!busy}
      className="p-5"
    >
      {step === "input" && (
        <div className="space-y-4">
          <p className="text-sm text-muted">{kind.intro}</p>
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
                <img src={preview} alt="Screenshot to scan" className="max-h-56 mx-auto rounded-token-md" />
              ) : (
                <div className="py-6">
                  <ImageUp size={30} className="mx-auto text-muted mb-2" />
                  <p className="text-sm font-bold text-ink">Tap to choose a screenshot</p>
                  <p className="text-xs text-muted mt-1">or drag it here, or press Ctrl+V</p>
                </div>
              )}
            </div>
          ) : (
            <Field label={kind.pasteLabel} hint={kind.pasteHint}>
              <Textarea
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={kind.pastePlaceholder}
                className="font-mono text-xs"
              />
            </Field>
          )}

          {kind.InputExtras && <kind.InputExtras opts={opts} setOpts={setOpts} ctx={ctx} />}

          {busy && (
            <div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full bg-grad-hero transition-all" style={{ width: `${Math.max(5, progress * 100)}%` }} />
              </div>
              <p className="text-xs text-muted mt-1.5">Reading text… the first time takes a little longer while the reader downloads.</p>
            </div>
          )}
          {error && <p className="text-sm text-focus">{error}</p>}
          {error && <UnreadLines lines={unread} title="What the scanner read" open />}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="primary" onClick={readInput} disabled={busy || (mode === "image" ? !file : !text.trim())} className="gap-1.5">
              <ScanText size={16} /> {busy ? "Reading…" : "Scan"}
            </Button>
          </div>
        </div>
      )}

      {step === "decide" && (
        <div className="space-y-4">
          <div className="flex gap-3 items-start rounded-token-lg bg-warn/10 p-4">
            <AlertTriangle size={22} className="text-warn shrink-0 mt-0.5" />
            <p className="text-sm text-ink">
              Only <b>{rec.matched}</b> of the {count(items.length, kind.noun)} in this scan {rec.matched === 1 ? "matches" : "match"} the{" "}
              {count(rec.scope.length, kind.noun)} already in your account.
            </p>
          </div>
          <div>
            <p className="font-bold text-ink">{kind.replaceQuestion}</p>
            <p className="text-sm text-muted mt-1">{kind.replaceExplain}</p>
          </div>
          <div className="flex flex-wrap justify-between gap-2 pt-1">
            <Button variant="ghost" onClick={() => setStep("input")} className="gap-1.5"><ArrowLeft size={16} /> Back</Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="soft" onClick={() => { setReplace(false); setStep("review"); }}>No, keep both</Button>
              <Button variant="primary" onClick={() => { setReplace(true); setStep("review"); }}>Yes, replace</Button>
            </div>
          </div>
        </div>
      )}

      {step === "review" && (
        // Only the list scrolls; the summary and buttons stay inside the frame.
        <div className="flex flex-col gap-3 max-h-[calc(85vh-6.5rem)]">
          <div className="shrink-0 space-y-2">
            <p className="text-sm text-muted">
              Found {count(items.length, kind.noun)}: <b className="text-ink">{tally.new} new</b> · <b className="text-ink">{tally.changed} to update</b> ·{" "}
              {tally.same} already up to date. {kind.reviewNote}
            </p>
            {replace && removes.length > 0 ? (
              <div className="rounded-token-md bg-focus/10 px-3 py-2">
                <p className="text-sm font-bold text-ink">{kind.removeHeading(removes.length)}</p>
                <p className="text-xs text-muted mt-0.5 line-clamp-3">{removes.map((e) => kind.label(e, ctx)).join(" · ")}</p>
                <button type="button" onClick={() => setReplace(false)} className="text-xs font-bold text-brand mt-1">Keep them instead</button>
              </div>
            ) : !replace && rec.unmatched.length > 0 ? (
              <p className="text-xs text-muted">
                {count(rec.unmatched.length, kind.noun)} in your account {rec.unmatched.length === 1 ? "isn't" : "aren't"} in this scan — {rec.unmatched.length === 1 ? "it stays" : "they stay"} as {rec.unmatched.length === 1 ? "it is" : "they are"}.
                {rec.mostlyDifferent && (
                  <button type="button" onClick={() => setReplace(true)} className="font-bold text-brand ml-1">Replace them instead</button>
                )}
              </p>
            ) : null}
            <UnreadLines lines={unread} title={`${unread.length} line${unread.length === 1 ? "" : "s"} on the page ${unread.length === 1 ? "wasn't" : "weren't"} used`} />
            {kind.ReviewExtras && <kind.ReviewExtras opts={opts} setOpts={setOpts} ctx={ctx} datas={datas} updateAll={updateAll} />}
          </div>

          <div className="space-y-2.5 overflow-y-auto min-h-0 flex-1 ff-modal-no-scrollbar -mx-1 px-1 pb-1">
            {items.map((r) => (
              <ReviewRow
                key={r.i}
                row={r}
                kind={kind}
                ctx={ctx}
                onInclude={(v) => updateRow(r.i, { include: v })}
                onOpen={(v) => updateRow(r.i, { open: v })}
                update={(fn) => updateData(r.i, fn)}
              />
            ))}
          </div>

          {error && <p className="text-sm text-focus shrink-0">{error}</p>}

          <div className="flex justify-between gap-2 shrink-0 pt-3 border-t border-[rgb(var(--ink)/0.08)]">
            <Button variant="ghost" onClick={() => { setStep("input"); setError(""); }} disabled={busy} className="gap-1.5">
              <ArrowLeft size={16} /> Back
            </Button>
            {actions.length ? (
              <Button variant="primary" onClick={apply} disabled={busy}>{busy ? "Saving…" : actions.join(" · ")}</Button>
            ) : tally.new + tally.changed > 0 ? (
              <Button variant="primary" disabled>
                {items.some((r) => r.status !== "same" && r.include && !r.valid) ? "Fill in the missing details" : "Nothing selected"}
              </Button>
            ) : (
              <Button variant="primary" onClick={onClose} disabled={busy}>Nothing to change — close</Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
