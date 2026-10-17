import React, { useMemo } from "react";
import { useApp } from "../../components/context/AppContext";
import ScanImportModal from "../scanner/ScanImportModal";
import { subjectsScan } from "../scanner/kinds/subjects";

// Timetable scanner (Subjects page + Daily Routine). Compares the scan with
// the subjects already in the account — see features/scanner.
export default function TimetableImportModal({ open, onClose, existing = [], onImported }) {
  const { refreshSubjectData } = useApp();
  const ctx = useMemo(() => ({ subjects: existing }), [existing]);
  // The dashboard keeps its own copy of the subject numbers, so refresh that too.
  const done = async (summary) => {
    await refreshSubjectData?.();
    await onImported?.(summary);
  };
  return <ScanImportModal open={open} onClose={onClose} kind={subjectsScan} ctx={ctx} onDone={done} />;
}
