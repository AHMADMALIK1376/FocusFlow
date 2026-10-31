import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useMaxWidth } from './useMaxWidth';

function Probe({ px }) {
  return <p>{useMaxWidth(px) ? 'narrow' : 'wide'}</p>;
}

function fakeMatchMedia(initial) {
  const listeners = [];
  const mq = {
    matches: initial,
    addEventListener: (_, fn) => listeners.push(fn),
    removeEventListener: (_, fn) => listeners.splice(listeners.indexOf(fn), 1),
  };
  window.matchMedia = jest.fn(() => mq);
  return { mq, fire: (m) => { mq.matches = m; listeners.forEach((fn) => fn()); } };
}

afterEach(() => { delete window.matchMedia; });

test('without matchMedia it answers wide (full size)', () => {
  render(<Probe px={639} />);
  expect(screen.getByText('wide')).toBeInTheDocument();
});

test('it starts from the current width and follows changes', () => {
  const { fire } = fakeMatchMedia(true);
  render(<Probe px={639} />);
  expect(screen.getByText('narrow')).toBeInTheDocument();
  expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 639px)');
  act(() => fire(false));
  expect(screen.getByText('wide')).toBeInTheDocument();
});
