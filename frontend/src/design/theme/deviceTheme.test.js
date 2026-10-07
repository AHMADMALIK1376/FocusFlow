import {
  DEVICE_THEME_KEY, readDeviceTheme, writeDeviceTheme, pickShownTheme, initialShownTheme,
} from './deviceTheme';
import { DEFAULT_THEME } from './theme';

const RAW = 'focusflow:theme.device';
const PURPLE = { ...DEFAULT_THEME, presetId: 'purple', background: '#1A0B3D', brand: '#FF6B6B', accent: '#4ECDC4' };
const BLUE = { ...DEFAULT_THEME, presetId: 'blue', brand: '#2546F0' };

beforeEach(() => localStorage.clear());

describe('device theme storage', () => {
  it('uses the documented key', () => {
    expect(DEVICE_THEME_KEY).toBe('theme.device');
    writeDeviceTheme(PURPLE);
    expect(localStorage.getItem(RAW)).not.toBeNull();
  });

  it('stores a clean copy of a non-default theme and reads it back', () => {
    const out = writeDeviceTheme({ ...PURPLE, brand: '#ff6b6b' });
    expect(out).toEqual(PURPLE);
    expect(JSON.parse(localStorage.getItem(RAW))).toEqual(PURPLE);
    expect(readDeviceTheme()).toEqual(PURPLE);
  });

  it('a default (or invalid) theme is not stored and removes what was there', () => {
    writeDeviceTheme(PURPLE);
    expect(writeDeviceTheme(DEFAULT_THEME)).toBeNull();
    expect(localStorage.getItem(RAW)).toBeNull();
    writeDeviceTheme(PURPLE);
    expect(writeDeviceTheme({ brand: 'red' })).toBeNull();
    expect(localStorage.getItem(RAW)).toBeNull();
    expect(writeDeviceTheme(undefined)).toBeNull();
  });

  it('nothing stored reads as null', () => {
    expect(readDeviceTheme()).toBeNull();
  });

  const BAD = {
    'not JSON': '{oops',
    'a string': JSON.stringify('x'),
    'extra keys': JSON.stringify({ ...PURPLE, evil: 1 }),
    'old version': JSON.stringify({ ...PURPLE, v: 0 }),
    'bad colour': JSON.stringify({ ...PURPLE, brand: '#EC706D;x:url(y)' }),
    'a default theme': JSON.stringify(DEFAULT_THEME),
    'an array': '[]',
  };
  Object.entries(BAD).forEach(([name, raw]) => {
    it(`${name} is treated as absent and removed`, () => {
      localStorage.setItem(RAW, raw);
      expect(readDeviceTheme()).toBeNull();
      expect(localStorage.getItem(RAW)).toBeNull();
    });
  });
});

describe('pickShownTheme', () => {
  const cases = [
    // own, device, expected
    [true, PURPLE, 'theme'],
    [true, null, 'theme'],
    [false, PURPLE, 'device'],
    [false, null, 'theme'],
  ];
  cases.forEach(([own, deviceTheme, expected]) => {
    it(`own=${own} device=${deviceTheme ? 'yes' : 'no'} shows the ${expected}`, () => {
      const theme = BLUE;
      const shown = pickShownTheme({ own, theme, deviceTheme });
      expect(shown).toBe(expected === 'theme' ? theme : deviceTheme);
    });
  });
});

describe('initialShownTheme (outside the provider)', () => {
  it('prefers the device theme, then the saved preferences, then null', () => {
    expect(initialShownTheme()).toBeNull();
    localStorage.setItem('focusflow:preferences', JSON.stringify({ theme: BLUE }));
    expect(initialShownTheme()).toEqual(BLUE);
    writeDeviceTheme(PURPLE);
    expect(initialShownTheme()).toEqual(PURPLE);
  });

  it('ignores a broken saved theme', () => {
    localStorage.setItem('focusflow:preferences', JSON.stringify({ theme: { brand: 'red' } }));
    expect(initialShownTheme()).toBeNull();
    localStorage.setItem('focusflow:preferences', '{oops');
    expect(initialShownTheme()).toBeNull();
  });
});
