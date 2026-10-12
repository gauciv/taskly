/** Build a static RGBA tint. Do not call this from an animated worklet. */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([\da-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const clamped = Math.min(1, Math.max(0, alpha));
  return `rgba(${parseInt(match[1].slice(0, 2), 16)},${parseInt(match[1].slice(2, 4), 16)},${parseInt(match[1].slice(4, 6), 16)},${clamped.toFixed(3)})`;
}
