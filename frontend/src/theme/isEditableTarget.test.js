import { isEditableTarget } from './isEditableTarget';

describe('isEditableTarget', () => {
  function el(tagName, isContentEditable = false) {
    return { tagName, isContentEditable };
  }

  it('returns true for INPUT', () => {
    expect(isEditableTarget(el('INPUT'))).toBe(true);
  });

  it('returns true for TEXTAREA', () => {
    expect(isEditableTarget(el('TEXTAREA'))).toBe(true);
  });

  it('returns true for SELECT', () => {
    expect(isEditableTarget(el('SELECT'))).toBe(true);
  });

  it('returns true for a contentEditable element', () => {
    expect(isEditableTarget(el('DIV', true))).toBe(true);
  });

  it('returns false for DIV (not editable)', () => {
    expect(isEditableTarget(el('DIV', false))).toBe(false);
  });

  it('returns false for BUTTON', () => {
    expect(isEditableTarget(el('BUTTON', false))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isEditableTarget(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isEditableTarget(undefined)).toBe(false);
  });
});
