
export function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }

  return value > 1 ? 1 : value;
}

export function easeOutCubic(t: number): number {
  const inverse = 1 - clamp01(t);

  return 1 - inverse * inverse * inverse;
}

export function introAlpha(elapsed: number, at: number, duration: number): number {
  if (duration <= 0) {
    return 1;
  }

  return easeOutCubic((elapsed - at) / duration);
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
