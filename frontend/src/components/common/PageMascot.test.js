import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PageMascot from './PageMascot';
import { PreferencesContext } from '../../preferences/PreferencesProvider';

const sheetOf = (container) => Array.from(container.querySelectorAll('span[style*="background-image"]')).map((s) => s.style.backgroundImage);

test('falls back to the default mascot with no provider', () => {
  const { container } = render(<PageMascot />);
  expect(sheetOf(container).join()).toContain('/mascots/sloth-directions.webp');
});

test('shows the mascot picked in the profile', () => {
  const { container } = render(
    <PreferencesContext.Provider value={{ profile: { mascot: 'rocket' } }}>
      <PageMascot />
    </PreferencesContext.Provider>
  );
  expect(sheetOf(container).join()).toContain('/mascots/rocket-directions.webp');
  expect(sheetOf(container).join()).toContain('/mascots/rocket-reactions.webp');
});

test('a poke shows a reaction', () => {
  const { container } = render(<PageMascot />);
  fireEvent.click(screen.getByRole('button', { name: /boop/i }));
  const [directions, reactions] = Array.from(container.querySelectorAll('span[style*="background-image"]'));
  expect(directions.style.opacity).toBe('0');
  expect(reactions.style.opacity).toBe('1');
});
