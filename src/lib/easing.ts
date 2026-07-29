// Easing functions for animation interpolation
// t is 0-1, returns 0-1

export function linear(t: number): number {
  return t;
}

export function easeInQuad(t: number): number {
  return t * t;
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeInSine(t: number): number {
  return 1 - Math.cos((t * Math.PI) / 2);
}

export function easeOutSine(t: number): number {
  return Math.sin((t * Math.PI) / 2);
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function easeInExpo(t: number): number {
  return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInOutExpo(t: number): number {
  return t === 0
    ? 0
    : t === 1
    ? 1
    : t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

// Cubic bezier for custom curves
// p0=0, p1=cp1, p2=cp2, p3=1
export function cubicBezier(t: number, cp1: number, cp2: number): number {
  const mt = 1 - t;
  return (
    mt * mt * mt * 0 +
    3 * mt * mt * t * cp1 +
    3 * mt * t * t * cp2 +
    t * t * t * 1
  );
}

export function getEasingFunction(type: string): (t: number) => number {
  switch (type) {
    case 'ease-in': return easeInQuad;
    case 'ease-out': return easeOutQuad;
    case 'ease-in-out': return easeInOutQuad;
    case 'ease-in-cubic': return easeInCubic;
    case 'ease-out-cubic': return easeOutCubic;
    case 'ease-in-out-cubic': return easeInOutCubic;
    case 'ease-in-sine': return easeInSine;
    case 'ease-out-sine': return easeOutSine;
    case 'ease-in-out-sine': return easeInOutSine;
    case 'ease-in-expo': return easeInExpo;
    case 'ease-out-expo': return easeOutExpo;
    case 'ease-in-out-expo': return easeInOutExpo;
    case 'linear': default: return linear;
  }
}

export const EASING_OPTIONS = [
  { label: 'Linear', value: 'linear' },
  { label: 'Ease In', value: 'ease-in' },
  { label: 'Ease Out', value: 'ease-out' },
  { label: 'Ease In-Out', value: 'ease-in-out' },
  { label: 'Ease In Cubic', value: 'ease-in-cubic' },
  { label: 'Ease Out Cubic', value: 'ease-out-cubic' },
  { label: 'Ease In-Out Cubic', value: 'ease-in-out-cubic' },
  { label: 'Ease In Sine', value: 'ease-in-sine' },
  { label: 'Ease Out Sine', value: 'ease-out-sine' },
  { label: 'Ease In-Out Sine', value: 'ease-in-out-sine' },
  { label: 'Ease In Expo', value: 'ease-in-expo' },
  { label: 'Ease Out Expo', value: 'ease-out-expo' },
  { label: 'Ease In-Out Expo', value: 'ease-in-out-expo' },
];
