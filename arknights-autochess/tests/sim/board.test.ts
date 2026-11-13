import { describe, expect, it } from 'vitest';
import { parseMap } from '../../src/content/map';
import { checkPlacement, facingToward } from '../../src/sim/board';
import { createRunState } from '../../src/sim/run';
import type { BoardPlacement, RunState } from '../../src/sim/state';
import { balanceFixture, makeContent, mapFixture } from '../fixtures/content';

const content = makeContent();
const map = parseMap(mapFixture);

function makeState(): RunState {
  return createRunState(content);
}

const placement = (uid: string, col: number, row: number): BoardPlacement => ({
  uid,
  at: { col, row },
  facing: 'down',
});

describe('摆放校验', () => {
  it('可部署格可以放', () => {
    expect(checkPlacement(makeState(), map, balanceFixture, { col: 1, row: 2 }).ok).toBe(true);
  });

  it('墙 / 普通地面不能放', () => {
    expect(checkPlacement(makeState(), map, balanceFixture, { col: 0, row: 0 }).ok).toBe(false);
    expect(checkPlacement(makeState(), map, balanceFixture, { col: 1, row: 1 }).ok).toBe(false);
  });

  it('越界不能放', () => {
    expect(checkPlacement(makeState(), map, balanceFixture, { col: -1, row: 2 }).ok).toBe(false);
    expect(checkPlacement(makeState(), map, balanceFixture, { col: 99, row: 99 }).ok).toBe(false);
  });

  it('同一格不能重复放', () => {
    const state: RunState = { ...makeState(), board: [placement('u1', 1, 2)] };
    expect(checkPlacement(state, map, balanceFixture, { col: 1, row: 2 }).ok).toBe(false);
  });

  it('上阵位满了不能放', () => {
    const state: RunState = { ...makeState(), board: [placement('u1', 1, 2)] };
    const full: RunState = {
      ...state,
      board: [placement('u1', 1, 2), placement('u2', 2, 2), placement('u3', 3, 2)],
    };
    expect(checkPlacement(full, map, balanceFixture, { col: 1, row: 2 }).ok).toBe(false);
  });
});

describe('朝向', () => {
  it('同格时默认朝下', () => {
    expect(facingToward({ col: 2, row: 2 }, { col: 2, row: 2 })).toBe('down');
  });

  it('按相对位置给方向', () => {
    expect(facingToward({ col: 2, row: 2 }, { col: 2, row: 0 })).toBe('up');
    expect(facingToward({ col: 2, row: 2 }, { col: 4, row: 2 })).toBe('right');
  });
});
