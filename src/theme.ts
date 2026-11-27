export type ThemeMode = 'light' | 'dark' | 'care';

/** Warm-paper palette: [lightest at tint 0, deepest at tint 100]. */
const WARM: Record<string, [string, string]> = {
  bg: ['#fffdf8', '#efddb4'],
  panel: ['#faf6ec', '#e6d0a2'],
  border: ['#e8e0cd', '#d2b981'],
  hover: ['#f3ecdb', '#dfc691'],
  text: ['#3a3226', '#2c2517'],
  muted: ['#7d7159', '#6a5e47'],
  'scrollbar-thumb': ['#d8cdb5', '#bfa778'],
};

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`;
}

/**
 * Paint the warm-yellow layer. Passing null removes the overrides so the
 * light/dark stylesheets take over again.
 */
export function applyCareTint(tint: number | null): void {
  const root = document.documentElement;
  if (tint === null) {
    for (const name of Object.keys(WARM)) root.style.removeProperty(`--${name}`);
    return;
  }
  const t = Math.max(0, Math.min(100, tint)) / 100;
  for (const [name, [light, deep]] of Object.entries(WARM)) {
    root.style.setProperty(`--${name}`, lerpColor(light, deep, t));
  }
}
