export interface HapticPatterns {
  light: [number];
  medium: [number];
  heavy: [number];
  success: [number, number, number];
  error: [number, number, number];
  warning: [number, number];
  selection: [number];
  impact: [number];
}

export const hapticPatterns: HapticPatterns = {
  light: [10],
  medium: [20],
  heavy: [40],
  success: [10, 50, 10],
  error: [100, 50, 100],
  warning: [50, 30],
  selection: [5],
  impact: [15]
};

export const useHaptic = () => {
  const vibrate = (pattern: number[] | number) => {
    if ('vibrate' in navigator) {
      return navigator.vibrate(pattern);
    }
    return false;
  };

  const hapticFeedback = (type: keyof HapticPatterns | number[]) => {
    if (Array.isArray(type)) {
      return vibrate(type);
    }
    return vibrate(hapticPatterns[type]);
  };

  return {
    vibrate,
    hapticFeedback,
    patterns: hapticPatterns
  };
};