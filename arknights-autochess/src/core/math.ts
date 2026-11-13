/**
 * 确定性数学小工具。
 *
 * 战斗解算要求「同样的输入在任何机器上得到同样的结果」，所以 `sim/` 里只用
 * + − × ÷ 和 `Math.sqrt()`（IEEE-754 精确舍入）；`Math.sin/cos/pow/hypot` 等
 * 各引擎实现可能差最后几位，一律走这里或干脆不用，`tools/check-layers.mjs` 会检查。
 */

import type { GridCoord } from './grid';

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function distance(a: GridCoord, b: GridCoord): number {
  const dc = a.col - b.col;
  const dr = a.row - b.row;
  return Math.sqrt(dc * dc + dr * dr);
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
