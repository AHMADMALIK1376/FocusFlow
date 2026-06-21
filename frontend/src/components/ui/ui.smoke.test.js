import * as UI from './index';

test('UI kit barrel exports all core components', () => {
  const expected = [
    'cx',
    'Button',
    'IconButton',
    'Card',
    'GlassCard',
    'Input',
    'Textarea',
    'Select',
    'Field',
    'Badge',
    'Pill',
    'Switch',
    'SegmentedControl',
    'Avatar',
    'ProgressRing',
    'StatCard',
    'Skeleton',
    'EmptyState',
    'Modal',
    'Sheet',
    'ThemeToggle',
    'LanguageSelect',
    'Stepper',
    'ToastProvider',
    'useToast',
  ];
  expected.forEach((name) => {
    expect(UI[name]).toBeDefined();
  });
});
