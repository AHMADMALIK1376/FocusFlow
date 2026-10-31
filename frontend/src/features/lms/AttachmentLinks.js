import React from "react";
import { FileText } from "lucide-react";

// "2.0 KB", "1.3 MB" for a file size in bytes.
export function sizeText(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return n ? `${n} B` : "";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// The files a teacher attached to an assignment on the LMS. Each opens in a new tab through FocusFlow's server, which fetches it from
// the LMS with the student's own key (the key never reaches the browser). Shows nothing when there are no files.
export default function AttachmentLinks({ files }) {
  if (!Array.isArray(files) || files.length === 0) return null;
  return (
    <ul aria-label="Files from your teacher" className="mt-1.5 space-y-1">
      {files.map((f) => (
        <li key={f.id} className="min-w-0">
          <a
            href={`/api/lms/file/${encodeURIComponent(f.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand hover:bg-brand/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <FileText size={12} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{f.name}</span>
            {sizeText(f.size) && <span className="shrink-0 font-medium text-muted">{sizeText(f.size)}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
