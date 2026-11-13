import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';

describe('createRng（确定性随机）', () => {
  it('同一种子产生同一串随机数', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const sequenceA = Array.from({ length: 8 }, () => a.next());
    const sequenceB = Array.from({ length: 8 }, () => b.next());
    expect(sequenceA).toEqual(sequenceB);
  });

  it('不同种子产生不同序列', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next() 落在 [0, 1)', () => {
    const rng = createRng(20261113);
    for (let i = 0; i < 200; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int() 落在 [0, max) 且拒绝非法上界', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i += 1) {
      const value = rng.int(6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
    }
    expect(() => rng.int(0)).toThrow(RangeError);
    expect(() => rng.int(1.5)).toThrow(RangeError);
  });

  it('pick() 对空数组返回 undefined', () => {
    expect(createRng(1).pick([])).toBeUndefined();
    expect([10, 20, 30]).toContain(createRng(1).pick([10, 20, 30]));
  });

  it('shuffle() 不修改入参且元素不丢', () => {
    const input = [1, 2, 3, 4, 5];
    const rng = createRng(99);
    const shuffled = rng.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect(createRng(99).shuffle(input)).toEqual(shuffled);
  });

  it('state() 可以续上同一条序列（存档/回放的基础）', () => {
    const rng = createRng(42);
    for (let i = 0; i < 5; i += 1) rng.next();
    const saved = rng.state();
    const expected = [rng.next(), rng.next(), rng.next()];

    const resumed = createRng(saved);
    expect([resumed.next(), resumed.next(), resumed.next()]).toEqual(expected);
  });
});
