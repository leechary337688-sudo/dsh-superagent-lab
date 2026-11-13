import { describe, expect, it } from 'vitest';
import { parseMap } from '../../src/content/map';
import type { BattleReport, BattleSimulator } from '../../src/sim/battle';
import { createPlaceholderBattle } from '../../src/sim/battle';
import {
  advancePhase,
  buyShopSlot,
  createRunState,
  levelUp,
  placeBenchUnit,
  refreshShop,
  sellBenchSlot,
  toggleShopLock,
} from '../../src/sim/run';
import type { RunState } from '../../src/sim/state';
import { balanceFixture, makeContent, mapFixture } from '../fixtures/content';

const emptyContent = makeContent({ operators: [] });
const content = makeContent();
const map = parseMap(mapFixture);

function fakeBattle(report: Partial<BattleReport> = {}): BattleSimulator {
  return {
    simulate: (spec) => ({
      round: spec.round,
      leaked: 0,
      damage: 0,
      ticks: 30,
      notes: [],
      ...report,
    }),
  };
}

function buyableState(): RunState {
  const base = createRunState(content);
  return { ...base, shop: ['op_a', null, null], gold: 10 };
}

describe('开局状态', () => {
  it('按配置初始化金币 / 生命 / 整备区 / 商店', () => {
    const state = createRunState(content);
    expect(state.phase).toBe('prep');
    expect(state.round).toBe(1);
    expect(state.gold).toBe(balanceFixture.economy.startingGold);
    expect(state.hp).toBe(balanceFixture.run.startingHp);
    expect(state.bench).toHaveLength(balanceFixture.bench.slots);
    expect(state.shop).toHaveLength(balanceFixture.shop.slots);
    // 开局会免费抽一次商店，rngState 已经前进；同一 seed 必须得到同一状态。
    const replay = createRunState(content);
    expect(replay.rngState).toBe(state.rngState);
    expect(replay.shop).toEqual(state.shop);
  });
});

describe('商店 / 经济动作', () => {
  it('招募：扣金币、进整备区、生成实例', () => {
    const result = buyShopSlot(buyableState(), content, 0);
    expect(result.ok).toBe(true);
    expect(result.state.gold).toBe(9);
    expect(result.state.shop[0]).toBeNull();
    expect(result.state.bench[0]).toBe('u1');
    expect(result.state.units['u1']).toEqual({ uid: 'u1', operatorId: 'op_a', star: 1 });
    expect(result.state.nextUid).toBe(2);
  });

  it('整备区满了不能招募', () => {
    const state: RunState = {
      ...buyableState(),
      bench: ['a', 'b', 'c', 'd', 'e'],
    };
    const result = buyShopSlot(state, content, 0);
    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
  });

  it('金币不足不能招募', () => {
    const state: RunState = { ...buyableState(), gold: 0 };
    expect(buyShopSlot(state, content, 0).ok).toBe(false);
  });

  it('升级扣金币并提升等级；满级后失败', () => {
    const state: RunState = { ...createRunState(emptyContent), gold: 100 };
    const first = levelUp(state, emptyContent);
    expect(first.ok).toBe(true);
    expect(first.state.level).toBe(2);
    expect(first.state.gold).toBe(98);

    const second = levelUp(first.state, emptyContent);
    expect(second.state.level).toBe(3);
    expect(levelUp(second.state, emptyContent).ok).toBe(false);
  });

  it('刷新商店扣刷新费；金币不足时失败', () => {
    const state: RunState = { ...createRunState(emptyContent), gold: 5 };
    const result = refreshShop(state, emptyContent);
    expect(result.ok).toBe(true);
    expect(result.state.gold).toBe(3);
    expect(refreshShop({ ...state, gold: 0 }, emptyContent).ok).toBe(false);
  });

  it('冻结商店切换状态', () => {
    const state = createRunState(emptyContent);
    expect(state.shopLocked).toBe(false);
    expect(toggleShopLock(state).state.shopLocked).toBe(true);
  });

  it('出售整备区的干员返还金币并清理实例', () => {
    const bought = buyShopSlot(buyableState(), content, 0).state;
    const result = sellBenchSlot(bought, content, 0);
    expect(result.ok).toBe(true);
    expect(result.state.gold).toBe(10);
    expect(result.state.units['u1']).toBeUndefined();
    expect(result.state.bench[0]).toBeNull();
  });
});

describe('部署', () => {
  it('把整备区干员放到可部署格', () => {
    const bought = buyShopSlot(buyableState(), content, 0).state;
    const result = placeBenchUnit(bought, content, map, 0, { col: 1, row: 2 });
    expect(result.ok).toBe(true);
    expect(result.state.board).toEqual([{ uid: 'u1', at: { col: 1, row: 2 }, facing: 'down' }]);
    expect(result.state.bench[0]).toBeNull();
  });

  it('不能放在墙上', () => {
    const bought = buyShopSlot(buyableState(), content, 0).state;
    expect(placeBenchUnit(bought, content, map, 0, { col: 0, row: 0 }).ok).toBe(false);
  });
});

describe('回合推进', () => {
  it('休整期 → 作战结算：按战斗报告扣目标生命', () => {
    const result = advancePhase(
      createRunState(emptyContent),
      emptyContent,
      map,
      fakeBattle({ damage: 30, leaked: 3 }),
    );
    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe('settle');
    expect(result.state.hp).toBe(70);
    expect(result.state.lastBattle?.damage).toBe(30);
  });

  it('目标生命归零直接结束', () => {
    const result = advancePhase(
      createRunState(emptyContent),
      emptyContent,
      map,
      fakeBattle({ damage: 999 }),
    );
    expect(result.state.phase).toBe('finished');
    expect(result.state.hp).toBe(0);
  });

  it('结算期 → 下一回合：发收入、回合 +1、商店刷新', () => {
    const settle: RunState = {
      ...createRunState(emptyContent),
      phase: 'settle',
      gold: 10,
      lastBattle: { round: 1, leaked: 0, damage: 0, ticks: 30, notes: [] },
    };
    const result = advancePhase(settle, emptyContent, map, fakeBattle());
    expect(result.state.phase).toBe('prep');
    expect(result.state.round).toBe(2);
    // 基础 5 + 利息 1；此时还没有连胜记录，所以没有连胜奖励（本轮结束后 streakWins 才变成 1）。
    expect(result.state.gold).toBe(16);
    expect(result.state.streakWins).toBe(1);
  });

  it('最后一回合结算后整局结束', () => {
    const contentOneRound = makeContent({
      operators: [],
      config: { ...balanceFixture, round: { total: 1, prepSeconds: 10 } },
    });
    const settle: RunState = {
      ...createRunState(contentOneRound),
      phase: 'settle',
      lastBattle: { round: 1, leaked: 0, damage: 0, ticks: 30, notes: [] },
    };
    expect(advancePhase(settle, contentOneRound, map, fakeBattle()).state.phase).toBe('finished');
  });

  it('非休整期不能做运营操作', () => {
    const state: RunState = { ...createRunState(emptyContent), phase: 'settle' };
    expect(refreshShop(state, emptyContent).ok).toBe(false);
    expect(buyShopSlot(state, emptyContent, 0).ok).toBe(false);
  });
});

describe('占位战斗解算', () => {
  it('返回完美防守（0 漏怪、0 伤害），保证 M0 能跑完整局', () => {
    const report = createPlaceholderBattle().simulate({
      map,
      round: 1,
      seed: 1,
      units: [],
      waves: [],
    });
    expect(report.leaked).toBe(0);
    expect(report.damage).toBe(0);
  });
});
