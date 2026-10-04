import React from "react";
import { useNavigate } from "react-router-dom";
import BudgetGauge from "./BudgetGauge";
import { useBudgetSnapshot } from "../../features/finance/useBudgetSnapshot";

const MONTH_YEAR = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

// This month's budget (allowance / spent / left / saved) in the dashboard's
// right rail.
export default function BudgetSnapshotCard() {
  const navigate = useNavigate();
  const b = useBudgetSnapshot();
  const money = (n) => (b ? `${b.cur}${Math.round(n).toLocaleString()}` : "—");
  const rows = [
    ["Left", b?.value, b && b.value < 0 ? "text-focus" : "text-ink"],
    ["Spent", b?.spent, "text-ink"],
    ["Allowance", b?.allowance, "text-ink"],
    ["Saved", b?.saved, "text-ink"],
  ];

  return (
    <button
      onClick={() => navigate("/budget")}
      className="w-full text-left rounded-token-lg bg-surface shadow-neu p-6 hover:-translate-y-0.5 transition-transform min-h-[232px] flex flex-col justify-center"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-ink">Budget</h3>
        <span className="text-xs text-muted">{MONTH_YEAR}</span>
      </div>
      <div className="flex items-center gap-5">
        <BudgetGauge
          allowance={b?.allowance ?? 0}
          remaining={b?.value ?? 0}
          spent={b?.spent ?? 0}
          savingsGoal={b?.savingsGoal ?? 0}
          saved={b?.saved ?? 0}
          cur={b?.cur ?? ""}
        />
        <dl className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2.5 min-w-0">
          {rows.map(([label, v, cls]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</dt>
              <dd className={`text-sm font-black truncate ${cls}`}>{money(v ?? 0)}</dd>
            </div>
          ))}
        </dl>
      </div>
      {!b && <p className="text-xs text-muted mt-3">Set a monthly allowance on the Budget page to track it here.</p>}
    </button>
  );
}
