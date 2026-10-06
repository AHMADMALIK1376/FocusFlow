import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Mascot from './Mascot';

// jsdom has no matchMedia: simulate a desktop with a mouse.
beforeAll(() => {
  window.matchMedia = (q) => ({ matches: q.includes('hover: hover'), addListener() {}, removeListener() {} });
});

// jsdom's PointerEvent drops coordinates, so send a MouseEvent under the same name.
const move = (x, y) => act(() => { window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y })); });
const layers = (c) => Array.from(c.querySelectorAll('span[style*="background-image"]'));

test('the head turns toward the pointer', () => {
  const { container } = render(<Mascot directions="/d.webp" reactions="/r.webp" size={100} />);
  const btn = screen.getByRole('button');
  btn.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
  expect(layers(container)[0].style.backgroundPosition).toBe('50% 50%'); // centre
  move(600, 50); // far to the right
  expect(layers(container)[0].style.backgroundPosition).toBe('100% 50%');
  move(52, 50); // close: back to centre
  expect(layers(container)[0].style.backgroundPosition).toBe('50% 50%');
});
