import { useReducer, useEffect } from 'react';
import storage from '../../storage/storageAdapter';
import { usePreferences } from '../../preferences/usePreferences';
import { reducer, EMPTY_STATE } from './moodLogic';

const keyFor = (id) => `feature:mood:${id}`;

export function useMood() {
  const { activeDashboardId } = usePreferences();
  const [state, dispatch] = useReducer(
    reducer,
    activeDashboardId,
    (id) => storage.get(keyFor(id), EMPTY_STATE)
  );

  useEffect(() => {
    dispatch({ type: 'HYDRATE', payload: storage.get(keyFor(activeDashboardId), EMPTY_STATE) });
  }, [activeDashboardId]);

  useEffect(() => {
    storage.set(keyFor(activeDashboardId), state);
  }, [activeDashboardId, state]);

  return { state, dispatch };
}
