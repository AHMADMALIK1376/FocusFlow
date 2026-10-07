import { useMemo } from 'react';
import { useActiveTheme } from './useActiveTheme';
import { tintLottie } from '../design/theme/lottieTint';

// A Lottie animation recoloured to the student's brand colour (the same object when it is the normal coral).
export function useThemedLottie(data) {
  const theme = useActiveTheme();
  const brand = theme ? theme.brand : null;
  return useMemo(() => tintLottie(data, brand), [data, brand]);
}
