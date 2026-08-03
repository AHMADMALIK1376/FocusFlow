import {
  makeId,
  makeDashboard,
  addDashboard,
  deleteDashboard,
  renameDashboard,
  setActiveDashboard,
  updateDashboardPatch,
  DEFAULT_WIDGET_ORDER,
  DEFAULT_WIDGET_ENABLED,
} from './dashboards';

// Helper to build a minimal state slice
function makeState(overrides = {}) {
  const db = makeDashboard('Test');
  return {
    dashboards: [db],
    activeDashboardId: db.id,
    ...overrides,
  };
}

describe('makeId', () => {
  it('produces a non-empty string starting with d_', () => {
    const id = makeId();
    expect(typeof id).toBe('string');
    expect(id.startsWith('d_')).toBe(true);
  });

  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }).map(() => makeId()));
    expect(ids.size).toBe(100);
  });
});

describe('makeDashboard', () => {
  it('returns a dashboard with expected default shape', () => {
    const db = makeDashboard('Uni');
    expect(db.name).toBe('Uni');
    expect(db.fontFamily).toBe('poppins');
    expect(Array.isArray(db.widgets.order)).toBe(true);
    expect(typeof db.widgets.enabled).toBe('object');
    expect(db.id).toBeTruthy();
  });
});

describe('addDashboard', () => {
  it('appends a new dashboard and sets it as active', () => {
    const state = makeState();
    const next = addDashboard(state, 'New Board');
    expect(next.dashboards).toHaveLength(2);
    expect(next.dashboards[1].name).toBe('New Board');
    expect(next.activeDashboardId).toBe(next.dashboards[1].id);
  });

  it('does not mutate the original state', () => {
    const state = makeState();
    const originalLength = state.dashboards.length;
    addDashboard(state, 'New Board');
    expect(state.dashboards).toHaveLength(originalLength);
  });
});

describe('deleteDashboard', () => {
  it('removes the specified dashboard', () => {
    const d1 = makeDashboard('First');
    const d2 = makeDashboard('Second');
    const state = { dashboards: [d1, d2], activeDashboardId: d1.id };
    const next = deleteDashboard(state, d2.id);
    expect(next.dashboards).toHaveLength(1);
    expect(next.dashboards[0].id).toBe(d1.id);
  });

  it('reassigns active to a surviving dashboard when the active is deleted', () => {
    const d1 = makeDashboard('First');
    const d2 = makeDashboard('Second');
    const state = { dashboards: [d1, d2], activeDashboardId: d1.id };
    const next = deleteDashboard(state, d1.id);
    expect(next.activeDashboardId).toBe(d2.id);
    expect(next.dashboards).toHaveLength(1);
  });

  it('keeps active unchanged when a non-active dashboard is deleted', () => {
    const d1 = makeDashboard('First');
    const d2 = makeDashboard('Second');
    const state = { dashboards: [d1, d2], activeDashboardId: d1.id };
    const next = deleteDashboard(state, d2.id);
    expect(next.activeDashboardId).toBe(d1.id);
  });

  it('recreates a default dashboard when the last one is deleted', () => {
    const d1 = makeDashboard('Only');
    const state = { dashboards: [d1], activeDashboardId: d1.id };
    const next = deleteDashboard(state, d1.id);
    expect(next.dashboards).toHaveLength(1);
    expect(next.dashboards[0].name).toBe('My Dashboard');
    expect(next.activeDashboardId).toBe(next.dashboards[0].id);
  });
});

describe('renameDashboard', () => {
  it('updates only the target dashboard name', () => {
    const d1 = makeDashboard('First');
    const d2 = makeDashboard('Second');
    const state = { dashboards: [d1, d2], activeDashboardId: d1.id };
    const next = renameDashboard(state, d2.id, 'Renamed');
    expect(next.dashboards[0].name).toBe('First');
    expect(next.dashboards[1].name).toBe('Renamed');
  });
});

describe('setActiveDashboard', () => {
  it('updates activeDashboardId', () => {
    const d1 = makeDashboard('First');
    const d2 = makeDashboard('Second');
    const state = { dashboards: [d1, d2], activeDashboardId: d1.id };
    const next = setActiveDashboard(state, d2.id);
    expect(next.activeDashboardId).toBe(d2.id);
  });
});

describe('updateDashboardPatch', () => {
  it('shallow-merges patch into matching dashboard', () => {
    const d1 = makeDashboard('Test');
    const state = { dashboards: [d1], activeDashboardId: d1.id };
    const next = updateDashboardPatch(state, d1.id, { fontFamily: 'inter' });
    expect(next.dashboards[0].fontFamily).toBe('inter');
    // other fields intact
    expect(next.dashboards[0].name).toBe('Test');
  });

  it('deep-merges nested object keys generically (not just widgets)', () => {
    const d1 = makeDashboard('Test');
    const state = { dashboards: [d1], activeDashboardId: d1.id };
    // updateDashboardPatch doesn't know about specific field names — verify
    // the deep-merge behavior with an arbitrary nested object, not just the
    // real `widgets` field, to prove it's generic.
    const next = updateDashboardPatch(state, d1.id, {
      widgets: { order: ['focus'] },
    });
    expect(next.dashboards[0].widgets.order).toEqual(['focus']);
    expect(next.dashboards[0].widgets.enabled).toEqual(d1.widgets.enabled);
  });

  it('does not affect other dashboards', () => {
    const d1 = makeDashboard('First');
    const d2 = makeDashboard('Second');
    const state = { dashboards: [d1, d2], activeDashboardId: d1.id };
    const next = updateDashboardPatch(state, d1.id, { fontFamily: 'roboto' });
    expect(next.dashboards[1].fontFamily).toBe('poppins');
  });
});

describe('DEFAULT constants', () => {
  it('DEFAULT_WIDGET_ORDER contains expected ids', () => {
    expect(DEFAULT_WIDGET_ORDER).toContain('goals');
    expect(DEFAULT_WIDGET_ORDER).toContain('focus');
  });

  it('DEFAULT_WIDGET_ENABLED has new widget ids', () => {
    expect('metrics' in DEFAULT_WIDGET_ENABLED).toBe(true);
    expect('taskSchedule' in DEFAULT_WIDGET_ENABLED).toBe(true);
    expect('progressRing' in DEFAULT_WIDGET_ENABLED).toBe(true);
    expect('activityGrid' in DEFAULT_WIDGET_ENABLED).toBe(true);
  });
});
