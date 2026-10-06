import React from 'react';
import { render } from '@testing-library/react';
import PageMascot from './PageMascot';
import { PreferencesContext } from '../../preferences/PreferencesProvider';

test('falls back to the default mascot with no provider', () => {
  const { container } = render(<PageMascot />);
  expect(container.querySelector('img')).toHaveAttribute('src', '/mascots/sloth.png');
});

test('shows the mascot picked in the profile', () => {
  const { container } = render(
    <PreferencesContext.Provider value={{ profile: { mascot: 'rocket' } }}>
      <PageMascot />
    </PreferencesContext.Provider>
  );
  expect(container.querySelector('img')).toHaveAttribute('src', '/mascots/rocket.png');
});
