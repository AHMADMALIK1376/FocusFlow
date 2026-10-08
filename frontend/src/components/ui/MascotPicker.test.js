import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MascotPicker } from './MascotPicker';
import { Avatar } from './Avatar';
import { MASCOTS, mascotSrc } from './mascots';

describe('mascots', () => {
  it('resolves known ids and rejects unknown ones', () => {
    expect(mascotSrc('sloth')).toBe('/mascots/sloth.webp');
    expect(mascotSrc('nope')).toBeNull();
    expect(mascotSrc(null)).toBeNull();
  });

  it('picker lists every mascot and reports the pick', () => {
    const onPick = jest.fn();
    const onClose = jest.fn();
    render(<MascotPicker open onClose={onClose} value="cap" onPick={onPick} />);
    expect(screen.getAllByRole('button', { pressed: undefined }).length).toBeGreaterThanOrEqual(MASCOTS.length);
    fireEvent.click(screen.getByText('Sloth'));
    expect(onPick).toHaveBeenCalledWith('sloth');
    expect(onClose).toHaveBeenCalled();
  });

  it('picker is a focus-trapped dialog with one heading, and focus returns to the opener after picking', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Choose mascot</button>
          <MascotPicker open={open} onClose={() => setOpen(false)} value="cap" onPick={() => {}} />
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Choose mascot' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Choose your mascot' });
    expect(document.activeElement).toBe(dialog);
    expect(screen.getAllByRole('heading', { name: 'Choose your mascot' })).toHaveLength(1);
    fireEvent.click(screen.getByText('Sloth'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it('Avatar shows the mascot when there is no photo, and the photo wins otherwise', () => {
    const { rerender } = render(<Avatar name="Ada" mascot="cap" />);
    expect(screen.getByAltText('Ada')).toHaveAttribute('src', '/mascots/cap.webp');
    rerender(<Avatar name="Ada" mascot="cap" src="data:image/png;base64,x" />);
    expect(screen.getByAltText('Ada')).toHaveAttribute('src', 'data:image/png;base64,x');
  });
});
