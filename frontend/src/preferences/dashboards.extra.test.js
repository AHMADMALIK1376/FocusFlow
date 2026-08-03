/**
 * Supplemental tests for dashboards.js covering spec requirements not already
 * addressed by dashboards.test.js:
 *
 * - delete-active reassigns to a DIFFERENT surviving dashboard (not itself)
 * - deleting the last dashboard is PREVENTED (list never zero dashboards)
 * - reorderWidgets-style update via updateDashboardPatch (widgets.order)
 * - toggleWidget-style update via updateDashboardPatch (widgets.enabled)
 * - immutability: all pure helpers return new objects
 * - DEFAULT_WIDGET_ORDER contains all 5 core widget ids
 * - makeDashboard with no args uses default name
 */
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

function makeState(overrides = {}) {
  const db = makeDashboard('Primary');
  return {
    dashboards: [db],
    activeDashboardId: db.id,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// deleteDashboard — list NEVER reaches zero
// ---------------------------------------------------------------------------
describe('deleteDashboard — invariant: list never empty', () => {
  it('deleting the only dashboard results in exactly 1 dashboard (never 0)', () => {
    const d = makeDashboard('Solo');
    const state = { dashboards: [d], activeDashboardId: d.id };
    const next = deleteDashboard(state, d.id);
    expect(next.dashboards.length).toBeGreaterThanOrEqual(1);
    expect(next.dashboards.length).toBe(1);
  });

  it('the recreated default dashboard has a valid id', () => {
    const d = makeDashboard('Solo');
    const state = { dashboards: [d], activeDashboardId: d.id };
    const next = deleteDashboard(state, d.id);
    expect(typeof next.dashboards[0].id).toBe('string');
    expect(next.dashboards[0].id).toBeTruthy();
  });

  it('the recreated default dashboard is the active one', () => {
    const d = makeDashboard('Solo');
    const state = { dashboards: [d], activeDashboardId: d.id };
    const next = deleteDashboard(state, d.id);
    expect(next.activeDashboardId).toBe(next.dashboards[0].id);
  });

  it('deleting a non-existent id leaves dashboards unchanged', () => {
    const d = makeDashboard('Only');
    const state = { dashboards: [d], activeDashboardId: d.id };
    const next = deleteDashboard(state, 'nonexistent_id');
    // remaining = [d], active still d.id
    expect(next.dashboards).toHaveLength(1);
    expect(next.dashboards[0].id).toBe(d.id);
    expect(next.activeDashboardId).toBe(d.id);
  });
});

// ---------------------------------------------------------------------------
// deleteDashboard — active reassignment correctness
// ---------------------------------------------------------------------------
describe('deleteDashboard — active reassignment', () => {
  it('when active is deleted among 3, reassigns to the FIRST surviving dashboard', () => {
    const d1 = makeDashboard('First');
    const d2 = makeDashboard('Second');
    const d3 = makeDashboard('Third');
    // d1 is active; delete d1 → should reassign to d2 (first surviving)
    const state = { dashboards: [d1, d2, d3], activeDashboardId: d1.id };
    const next = deleteDashboard(state, d1.id);
    expect(next.activeDashboardId).toBe(d2.id);
    expect(next.dashboards).toHaveLength(2);
  });

  it('deleting a middle non-active dashboard keeps original active', () => {
    const d1 = makeDashboard('First');
    const d2 = makeDashboard('Second');
    const d3 = makeDashboard('Third');
    const state = { dashboards: [d1, d2, d3], activeDashboardId: d3.id };
    const next = deleteDashboard(state, d2.id);
    expect(next.activeDashboardId).toBe(d3.id);
    expect(next.dashboards).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Immutability — all helpers return NEW references
// ---------------------------------------------------------------------------
describe('immutability', () => {
  it('addDashboard returns a new dashboards array reference', () => {
    const state = makeState();
    const next = addDashboard(state, 'New');
    expect(next.dashboards).not.toBe(state.dashboards);
  });

  it('deleteDashboard returns a new dashboards array reference', () => {
    const d1 = makeDashboard('A');
    const d2 = makeDashboard('B');
    const state = { dashboards: [d1, d2], activeDashboardId: d1.id };
    const next = deleteDashboard(state, d2.id);
    expect(next.dashboards).not.toBe(state.dashboards);
  });

  it('renameDashboard returns a new dashboards array reference', () => {
    const d = makeDashboard('Old');
    const state = { dashboards: [d], activeDashboardId: d.id };
    const next = renameDashboard(state, d.id, 'New');
    expect(next.dashboards).not.toBe(state.dashboards);
  });

  it('renameDashboard does not mutate the original dashboard object', () => {
    const d = makeDashboard('Old');
    const state = { dashboards: [d], activeDashboardId: d.id };
    renameDashboard(state, d.id, 'New');
    expect(d.name).toBe('Old');
  });

  it('setActiveDashboard returns a new state object', () => {
    const d1 = makeDashboard('A');
    const d2 = makeDashboard('B');
    const state = { dashboards: [d1, d2], activeDashboardId: d1.id };
    const next = setActiveDashboard(state, d2.id);
    expect(next).not.toBe(state);
  });

  it('updateDashboardPatch returns a new state object', () => {
    const state = makeState();
    const next = updateDashboardPatch(state, state.dashboards[0].id, { fontFamily: 'inter' });
    expect(next).not.toBe(state);
    expect(next.dashboards[0]).not.toBe(state.dashboards[0]);
  });
});

// ---------------------------------------------------------------------------
// updateDashboardPatch used for widget toggles and reorder (simulating toggleWidget / reorderWidgets)
// ---------------------------------------------------------------------------
describe('updateDashboardPatch — widget operations', () => {
  it('can toggle a widget off by patching widgets.enabled', () => {
    const d = makeDashboard('Test');
    // goals starts as true
    expect(d.widgets.enabled.goals).toBe(true);
    const state = { dashboards: [d], activeDashboardId: d.id };
    const next = updateDashboardPatch(state, d.id, {
      widgets: { ...d.widgets, enabled: { ...d.widgets.enabled, goals: false } },
    });
    expect(next.dashboards[0].widgets.enabled.goals).toBe(false);
  });

  it('can toggle a widget on by patching widgets.enabled', () => {
    const d = makeDashboard('Test');
    const state = { dashboards: [d], activeDashboardId: d.id };
    // activityGrid starts false; toggle it on
    const next = updateDashboardPatch(state, d.id, {
      widgets: { ...d.widgets, enabled: { ...d.widgets.enabled, activityGrid: true } },
    });
    expect(next.dashboards[0].widgets.enabled.activityGrid).toBe(true);
  });

  it('can reorder widgets by patching widgets.order', () => {
    const d = makeDashboard('Test');
    const state = { dashboards: [d], activeDashboardId: d.id };
    const newOrder = ['focus', 'goals', 'academic', 'uniCalendar', 'dailyTimetable'];
    const next = updateDashboardPatch(state, d.id, {
      widgets: { ...d.widgets, order: newOrder },
    });
    expect(next.dashboards[0].widgets.order).toEqual(newOrder);
  });

  it('toggle patch does not affect other dashboards widgets', () => {
    const d1 = makeDashboard('Workspace 1');
    const d2 = makeDashboard('Workspace 2');
    const state = { dashboards: [d1, d2], activeDashboardId: d1.id };
    const next = updateDashboardPatch(state, d1.id, {
      widgets: { ...d1.widgets, enabled: { ...d1.widgets.enabled, focus: false } },
    });
    // d2's focus should still be its original value
    expect(next.dashboards[1].widgets.enabled.focus).toBe(d2.widgets.enabled.focus);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_WIDGET_ORDER — completeness
// ---------------------------------------------------------------------------
describe('DEFAULT_WIDGET_ORDER — contains all 5 core widget ids', () => {
  const coreIds = ['goals', 'uniCalendar', 'dailyTimetable', 'academic', 'focus'];
  coreIds.forEach((id) => {
    it(`contains "${id}"`, () => {
      expect(DEFAULT_WIDGET_ORDER).toContain(id);
    });
  });

  it('has at least 5 core entries (new feature ids may also be present)', () => {
    expect(DEFAULT_WIDGET_ORDER.length).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_WIDGET_ENABLED — completeness for new Req 5 widget ids
// ---------------------------------------------------------------------------
describe('DEFAULT_WIDGET_ENABLED — new widget defaults from Req 5', () => {
  it('metrics is enabled by default', () => {
    expect(DEFAULT_WIDGET_ENABLED.metrics).toBe(true);
  });

  it('taskSchedule is disabled by default', () => {
    expect(DEFAULT_WIDGET_ENABLED.taskSchedule).toBe(false);
  });

  it('progressRing is disabled by default', () => {
    expect(DEFAULT_WIDGET_ENABLED.progressRing).toBe(false);
  });

  it('activityGrid is disabled by default', () => {
    expect(DEFAULT_WIDGET_ENABLED.activityGrid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// makeDashboard — default name
// ---------------------------------------------------------------------------
describe('makeDashboard — defaults', () => {
  it('uses "My Dashboard" when no name is passed', () => {
    const d = makeDashboard();
    expect(d.name).toBe('My Dashboard');
  });

  it('returns a dashboard with the correct fontFamily default', () => {
    const d = makeDashboard('Test');
    expect(d.fontFamily).toBe('poppins');
  });

  it('widget.order is a copy of DEFAULT_WIDGET_ORDER (not the same reference)', () => {
    const d = makeDashboard('Test');
    expect(d.widgets.order).toEqual(DEFAULT_WIDGET_ORDER);
    expect(d.widgets.order).not.toBe(DEFAULT_WIDGET_ORDER);
  });

  it('widget.enabled is a copy of DEFAULT_WIDGET_ENABLED (not same reference)', () => {
    const d = makeDashboard('Test');
    expect(d.widgets.enabled).toEqual(DEFAULT_WIDGET_ENABLED);
    expect(d.widgets.enabled).not.toBe(DEFAULT_WIDGET_ENABLED);
  });
});

// ---------------------------------------------------------------------------
// create + switch + rename + delete sequence (end-to-end reducer chain)
// ---------------------------------------------------------------------------
describe('reducer chain: create → rename → switch → delete', () => {
  it('a complete CRUD sequence leaves dashboards in a consistent state', () => {
    // Start: 1 dashboard
    let state = makeState();
    const originalId = state.dashboards[0].id;

    // Create
    state = addDashboard(state, 'Work');
    expect(state.dashboards).toHaveLength(2);
    const workId = state.dashboards[1].id;
    expect(state.activeDashboardId).toBe(workId);

    // Rename the first
    state = { ...state, ...renameDashboard(state, originalId, 'Personal') };
    expect(state.dashboards.find((d) => d.id === originalId).name).toBe('Personal');

    // Switch back to original
    state = setActiveDashboard(state, originalId);
    expect(state.activeDashboardId).toBe(originalId);

    // Delete the Work dashboard
    state = deleteDashboard(state, workId);
    expect(state.dashboards).toHaveLength(1);
    expect(state.dashboards[0].id).toBe(originalId);
    expect(state.activeDashboardId).toBe(originalId);
  });
});
