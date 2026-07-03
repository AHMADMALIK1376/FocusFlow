import { useState, useEffect, useCallback } from 'react';
import { budgetAPI } from '../../services/api';

const DEFAULT_SETTINGS = { monthlyAllowance: 0, currency: 'PKR', savingsGoal: 0 };

// API-backed Budget (migrated from localStorage Finance). The compat `state`
// keeps the dashboard FinanceCard (which reads totals(state)) working unchanged.
export function useFinance() {
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const d = await budgetAPI.get();
      setEntries(d.entries || []);
      setSettings(d.settings || DEFAULT_SETTINGS);
    } catch {
      setEntries([]);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addEntry = useCallback(async (e) => { await budgetAPI.addEntry(e); await refresh(); }, [refresh]);
  const removeEntry = useCallback(async (id) => { await budgetAPI.removeEntry(id); await refresh(); }, [refresh]);
  const saveSettings = useCallback(async (s) => { await budgetAPI.saveSettings(s); await refresh(); }, [refresh]);

  return { state: { entries }, entries, settings, loading, addEntry, removeEntry, saveSettings, refresh };
}
