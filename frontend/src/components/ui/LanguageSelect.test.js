import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { LanguageSelect } from './LanguageSelect';
import { Modal } from './Modal';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en' } }) }));
jest.mock('../../i18n', () => ({
  AVAILABLE_LANGUAGES: [
    { code: 'en', native: 'English', label: 'English' },
    { code: 'de', native: 'Deutsch', label: 'German' },
  ],
  setLanguage: jest.fn(),
}));

function setup() {
  const onClose = jest.fn();
  render(<Modal open onClose={onClose} title="Language"><LanguageSelect /></Modal>);
  const trigger = screen.getByRole('button', { name: /English/ });
  fireEvent.click(trigger);
  return { onClose, trigger };
}

test('the list is plain buttons with clean names, the chosen one is aria-current, and search has a label', () => {
  setup();
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(screen.queryAllByRole('option')).toHaveLength(0);
  expect(screen.getByLabelText('Search language')).toBeInTheDocument();
  const list = within(screen.getByRole('list'));
  expect(list.getByRole('button', { name: 'English' })).toHaveAttribute('aria-current', 'true');
  expect(list.getByRole('button', { name: 'Deutsch' })).not.toHaveAttribute('aria-current');
});

test('Escape closes the list only, and focus stays on the control', () => {
  const { onClose, trigger } = setup();
  fireEvent.keyDown(screen.getByLabelText('Search language'), { key: 'Escape' });
  expect(screen.queryByLabelText('Search language')).toBeNull();
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(onClose).not.toHaveBeenCalled();
});

test('choosing a language closes the list and focus goes back to the control', () => {
  const { trigger } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Deutsch' }));
  expect(screen.queryByLabelText('Search language')).toBeNull();
  expect(trigger).toHaveFocus();
});
