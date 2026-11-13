import { describe, expect, it } from 'vitest';
import { autoMerge, MERGE_COUNT } from '../../src/sim/merge';
import { createRunState } from '../../src/sim/run';
import type { OperatorInstance, RunState } from '../../src/sim/state';
import { makeContent } from '../fixtures/content';

function unit(uid: string, operatorId: string, star: 1 | 2 | 3 = 1): OperatorInstance {
  return { uid, operatorId, star };
}

function stateWithUnits(units: OperatorInstance[]): RunState {
  const base = createRunState(makeContent({ operators: [] }));
  const bench = base.bench.map((_, index) => units[index]?.uid ?? null);
  const unitMap: Record<string, OperatorInstance> = {};
  for (const item of units) unitMap[item.uid] = item;
  return { ...base, units: unitMap, bench, nextUid: units.length + 1 };
}

describe('三合一', () => {
  it('三个同名 1 星合成一个 2 星，宿主保留在第一个整备位', () => {
    const next = autoMerge(stateWithUnits([unit('u1', 'op_a'), unit('u2', 'op_a'), unit('u3', 'op_a')]));
    expect(Object.keys(next.units)).toEqual(['u1']);
    expect(next.units['u1']?.star).toBe(2);
    expect(next.bench).toEqual(['u1', null, null, null, null]);
  });

  it('九个同名 1 星最终合成一个 3 星', () => {
    const units = Array.from({ length: 9 }, (_, index) => unit(`u${index + 1}`, 'op_a'));
    const next = autoMerge(stateWithUnits(units));
    expect(Object.keys(next.units)).toEqual(['u1']);
    expect(next.units['u1']?.star).toBe(3);
  });

  it('不同干员不会互相合成', () => {
    const next = autoMerge(
      stateWithUnits([
        unit('u1', 'op_a'),
        unit('u2', 'op_a'),
        unit('u3', 'op_b'),
        unit('u4', 'op_b'),
      ]),
    );
    expect(Object.keys(next.units).sort()).toEqual(['u1', 'u2', 'u3', 'u4']);
  });

  it('已 3 星的不再合成', () => {
    const next = autoMerge(stateWithUnits([unit('u1', 'op_a', 3), unit('u2', 'op_a', 3), unit('u3', 'op_a', 3)]));
    expect(Object.keys(next.units).sort()).toEqual(['u1', 'u2', 'u3']);
  });

  it('棋盘上被吃掉的实例连同摆放一起移除', () => {
    const base = stateWithUnits([unit('u1', 'op_a'), unit('u2', 'op_a'), unit('u3', 'op_a')]);
    const state: RunState = {
      ...base,
      board: [{ uid: 'u2', at: { col: 1, row: 2 }, facing: 'down' }],
    };
    const next = autoMerge(state);
    expect(next.board).toEqual([]);
    expect(next.units['u1']?.star).toBe(2);
  });

  it('合成数量常量是 3（和自走棋习惯一致）', () => {
    expect(MERGE_COUNT).toBe(3);
  });
});
