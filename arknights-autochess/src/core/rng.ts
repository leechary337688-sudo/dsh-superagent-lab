/**
 * 确定性伪随机数生成器（mulberry32）。
 *
 * 规则：`sim/` 里禁止使用 `Math.random()` 和 `Date.now()`。同一个种子必须得到同一串随机数，
 * 否则回放、联机校验、golden 测试都无从谈起。RNG 状态是普通 number，跟着 `RunState`
 * 一起序列化，所以存档/重连之后随机序列还能继续。
 */

export interface Rng {
  /** 下一个 [0, 1) 浮点数。 */
  next(): number;
  /** [0, maxExclusive) 的整数；`maxExclusive` 必须是正整数。 */
  int(maxExclusive: number): number;
  /** 均匀取一个元素，空数组返回 undefined。 */
  pick<T>(items: readonly T[]): T | undefined;
  /** 返回洗牌后的新数组（不修改入参）。 */
  shuffle<T>(items: readonly T[]): T[];
  /** 内部状态；把 `createRng(state)` 传回去就能续上同一条序列。 */
  state(): number;
}

export function createRng(seed: number): Rng {
  let state = Math.floor(seed) >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError(`Rng.int() 需要正整数上界，实际收到 ${maxExclusive}`);
    }
    return Math.floor(next() * maxExclusive);
  };

  const pick = <T>(items: readonly T[]): T | undefined => {
    if (items.length === 0) return undefined;
    return items[int(items.length)];
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = int(i + 1);
      const a = out[i];
      const b = out[j];
      out[i] = b as T;
      out[j] = a as T;
    }
    return out;
  };

  return { next, int, pick, shuffle, state: () => state };
}
