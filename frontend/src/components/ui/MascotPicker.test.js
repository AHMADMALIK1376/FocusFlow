import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MascotPicker } from './MascotPicker';
import { Avatar } from './Avatar';
import { MASCOTS, mascotSrc } from './mascots';

describe('mascots', () => {
  it('resolves known ids and rejects unknown ones', () => {
    expect(mascotSrc('sloth')).toBe('/mascots/sloth.png');
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

  it('Avatar shows the mascot when there is no photo, and the photo wins otherwise', () => {
    const { rerender } = render(<Avatar name="Ada" mascot="cap" />);
    expect(screen.getByAltText('Ada')).toHaveAttribute('src', '/mascots/cap.png');
    rerender(<Avatar name="Ada" mascot="cap" src="data:image/png;base64,x" />);
    expect(screen.getByAltText('Ada')).toHaveAttribute('src', 'data:image/png;base64,x');
  });
});
