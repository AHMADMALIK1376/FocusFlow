/**
 * Additional edge-case tests for isEditableTarget beyond the 8 baseline cases.
 * These cover spec requirements: "returns true for INPUT/TEXTAREA/SELECT/contentEditable,
 * false for div/button/null" plus additional tag types and boundary conditions.
 */
import { isEditableTarget } from './isEditableTarget';

function el(tagName, isContentEditable = false) {
  return { tagName, isContentEditable };
}

describe('isEditableTarget — additional tag coverage', () => {
  it('returns false for SPAN (non-editable inline element)', () => {
    expect(isEditableTarget(el('SPAN', false))).toBe(false);
  });

  it('returns false for A (anchor)', () => {
    expect(isEditableTarget(el('A', false))).toBe(false);
  });

  it('returns false for P (paragraph)', () => {
    expect(isEditableTarget(el('P', false))).toBe(false);
  });

  it('returns true for SPAN with isContentEditable=true', () => {
    expect(isEditableTarget(el('SPAN', true))).toBe(true);
  });

  it('returns false for INPUT-like tagName in wrong case (lowercase) — case sensitivity guard', () => {
    // The real browser always provides uppercase tagName; a lowercase 'input' should NOT match
    expect(isEditableTarget(el('input', false))).toBe(false);
  });
});

describe('isEditableTarget — boundary / falsy targets', () => {
  it('returns false for 0 (numeric falsy)', () => {
    expect(isEditableTarget(0)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isEditableTarget('')).toBe(false);
  });

  it('returns false for false', () => {
    expect(isEditableTarget(false)).toBe(false);
  });

  it('returns false for an object with no tagName and isContentEditable=false', () => {
    expect(isEditableTarget({ isContentEditable: false })).toBe(false);
  });

  it('returns true for an object with no tagName but isContentEditable=true', () => {
    // contentEditable alone should be enough
    expect(isEditableTarget({ isContentEditable: true })).toBe(true);
  });
});
