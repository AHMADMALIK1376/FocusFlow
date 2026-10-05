import React, { useMemo } from "react";
import ScanImportModal from "../scanner/ScanImportModal";
import { subjectsScan } from "../scanner/kinds/subjects";

// Timetable scanner (Subjects page + Daily Routine). Compares the scan with
// the subjects already in the account — see features/scanner.
export default function TimetableImportModal({ open, onClose, existing = [], onImported }) {
  const ctx = useMemo(() => ({ subjects: existing }), [existing]);
  return <ScanImportModal open={open} onClose={onClose} kind={subjectsScan} ctx={ctx} onDone={onImported} />;
}
