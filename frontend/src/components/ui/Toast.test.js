import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function Fire() {
  const { toast } = useToast();
  return <button onClick={() => toast('Colours saved', { tone: 'success' })}>Fire</button>;
}

test('toasts appear inside an always-mounted polite status region, so they are announced', () => {
  render(<ToastProvider><Fire /></ToastProvider>);
  const region = screen.getByRole('status');
  expect(region).toHaveAttribute('aria-live', 'polite');
  expect(region).toBeEmptyDOMElement();
  fireEvent.click(screen.getByText('Fire'));
  expect(region).toHaveTextContent('Colours saved');
  expect(screen.getByRole('status')).toBe(region);
});
