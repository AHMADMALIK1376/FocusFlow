# Phase 4c — Finance → Budget (DB) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the localStorage Finance feature into a DB-backed student **Budget** — pocket-money allowance in, spending out, monthly remaining, a savings goal, and spending charts. Currency default **PKR (₨)**.

**Architecture:** `BUDGET_ENTRIES` (income/expense) + `BUDGET_SETTINGS` (monthly_allowance, currency, savings_goal per user). `budgetController` = entries add/remove + a combined `getBudget` ({entries,settings}) + `saveSettings` (upsert). Frontend swaps localStorage `useFinance` for an API hook returning `{state:{entries}, entries, settings, loading, addEntry, removeEntry, saveSettings, refresh}` — the compat `state` keeps the dashboard `FinanceCard` working unchanged (it only reads `totals(state)`). `FinancePage` is reframed to **Budget** (title, ₨, allowance/remaining/savings tiles + settings panel), reusing the pure `financeLogic.totals/byCategory` and the existing pie/cash-flow charts. Nav route `/finance` → `/budget`, label "Budget". Internal ids/folder stay `finance` to limit churn.

**Tech Stack:** Node/Express + pg shim; React 19 CRA; recharts.
**Branch:** `feat/student-pivot`. Backend on :5555.

---

### Task 1: Tables + backend

**Files:** Create `backend/scripts/migrate-budget.js`, `backend/controllers/budgetController.js`, `backend/routes/budgetRoutes.js`; Modify `backend/server.js`.

Migration SQL:
```sql
CREATE TABLE IF NOT EXISTS BUDGET_ENTRIES (
  entry_id   VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  type       VARCHAR(10) NOT NULL,
  amount     DOUBLE PRECISION NOT NULL,
  category   VARCHAR(100),
  note       VARCHAR(300),
  entry_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS BUDGET_SETTINGS (
  user_id           VARCHAR(50) PRIMARY KEY REFERENCES USERS(user_id) ON DELETE CASCADE,
  monthly_allowance DOUBLE PRECISION DEFAULT 0,
  currency          VARCHAR(10) DEFAULT 'PKR',
  savings_goal      DOUBLE PRECISION DEFAULT 0,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_budget_user ON BUDGET_ENTRIES(user_id, entry_date);
```

Controller:
- `getBudget` → `{entries:[{id,type,amount,category,note,date,createdAt}], settings:{monthlyAllowance,currency,savingsGoal}}` (settings defaults 0/PKR/0 if no row); entries ordered `entry_date DESC, created_at DESC`.
- `addEntry` `{type,amount,category,note,date}` — reject amount ≤ 0; type normalized to income|expense; category default 'General'; date default today; 201 `{success,id}`.
- `removeEntry` `:id` scoped.
- `saveSettings` `{monthlyAllowance,currency,savingsGoal}` — upsert via `INSERT ... ON CONFLICT (user_id) DO UPDATE`.

Routes (all auth): `GET /`, `POST /entries`, `DELETE /entries/:id`, `PUT /settings`. Mount `app.use('/api/budget', budgetRoutes)` next to goals.

- [ ] **Step 1:** migration → `node backend/scripts/migrate-budget.js`.
- [ ] **Step 2:** controller + routes + mount; `node --check` all three → OK.
- [ ] **Step 3:** commit `feat(db+api): BUDGET_ENTRIES + BUDGET_SETTINGS + /api/budget`.
- [ ] **Step 4:** smoke: login → save settings (allowance 5000, PKR, savings 20000) → add income + expense → GET /api/budget (entries + settings) → delete an entry → GET reflects it. Self-cleaning (delete both entries after).

---

### Task 2: Frontend (API hook + Budget page + widget + nav)

**Files:** Modify `services/api.js` (`budgetAPI`); Rewrite `features/finance/useFinance.js`; Rewrite `Pages/FinancePage.js` (→ Budget); Modify `components/dashboard/widgets/FinanceCard.js`; `App.js`; `navItems.js`; `i18n/locales/en.json`. Keep `financeLogic.js` (totals/byCategory + test).

- [ ] **Step 1: `budgetAPI`** (after goalAPI): `get()`, `addEntry(data)`, `removeEntry(id)`, `saveSettings(data)` under `/budget`.
- [ ] **Step 2: Rewrite `useFinance.js`** → API-backed, returns `{state:{entries}, entries, settings, loading, addEntry, removeEntry, saveSettings, refresh}` (loads `budgetAPI.get()`; mutations await then refresh).
- [ ] **Step 3: Rewrite `FinancePage.js` as Budget**: title "Budget", subtitle "Track your pocket money — allowance in, spending out."; currency symbol from `settings.currency` via a `CURRENCIES` map (default ₨). Stat tiles: **Allowance** (monthly) · **Spent this month** · **Remaining** (allowance − month expenses) · **Saved** (all-time balance, with savings-goal % if set). A **settings** panel (monthly allowance + savings goal inputs + currency `Select`, Save button → `saveSettings`). Keep the spending-by-category pie + 7-day cash-flow chart + add-entry form (→ `addEntry`) + entries list (→ `removeEntry`), all formatted with the currency symbol. Reuse `totals`/`byCategory`.
- [ ] **Step 4: Update `FinanceCard.js`**: title/`widgets.finance` default → "Budget"; currency `$` → `₨`; `navigate('/finance')` → `navigate('/budget')` (both). (Still uses `totals(state)` from the compat hook.)
- [ ] **Step 5: `App.js`**: change the finance route `path="/finance"` → `path="/budget"` (element stays `<FinancePage />`).
- [ ] **Step 6: `navItems.js`**: the `finance` item → `path: '/budget', labelKey: 'nav.budget'` (keep id `finance`).
- [ ] **Step 7: `en.json`**: add `"budget": "Budget"` in `nav`.
- [ ] **Step 8:** build → `Compiled successfully.`
- [ ] **Step 9:** Browser `/budget`: set allowance/savings, add income+expense, see tiles/charts update, delete an entry; verify persistence via API.
- [ ] **Step 10:** `cd frontend && CI=true npx react-scripts test --watchAll=false 2>&1 | grep -E "Tests:|Test Suites:|FAIL"` → all pass.
- [ ] **Step 11:** commit `feat(fe): Finance reframed as DB-backed Budget (allowance, savings, PKR)`.

---

## Self-Review

**Spec coverage:** Implements the spec's `BUDGET_ENTRIES` + settings (§4) and Budget behavior (§5) — pocket-money allowance, expenses by category, monthly remaining, savings goal, charts, PKR default. Completes Phase 4 (Notes + Goals + Budget → DB). No 4c requirement unimplemented.

**Placeholder scan:** Migration SQL, controller contracts, `budgetAPI`, hook shape are concrete; the page reframe is specified by tiles/panels/formatters + exact route/nav/i18n edits. No plan placeholders.

**Type/identifier consistency:** Entry shape `{id,type,amount,category,note,date}` unchanged from the reducer, so `totals`/`byCategory`/`FinanceCard` keep working; hook exposes compat `state:{entries}` for `FinanceCard`. Settings `{monthlyAllowance,currency,savingsGoal}` consistent across controller, hook, page. Routes `/budget`, `/budget/entries`, `/budget/settings` match `budgetAPI` + server mount. Nav route `/budget` matches App.js + navItems + FinanceCard navigate.
