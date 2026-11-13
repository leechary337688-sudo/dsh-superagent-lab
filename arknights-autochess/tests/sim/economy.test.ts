import { describe, expect, it } from 'vitest';
import { boardSlots, interestFor, levelUpCost, roundIncome } from '../../src/sim/economy';
import { balanceFixture } from '../fixtures/content';

const economy = balanceFixture.economy;
const leveling = balanceFixture.leveling;
const board = balanceFixture.board;

describe('利息', () => {
  it('每 10 金币 1 利息，且受单回合上限约束', () => {
    expect(interestFor(0, economy)).toBe(0);
    expect(interestFor(9, economy)).toBe(0);
    expect(interestFor(10, economy)).toBe(1);
    expect(interestFor(47, economy)).toBe(4);
    expect(interestFor(100, economy)).toBe(economy.maxInterestPerRound);
  });

  it('负金币不产生负利息', () => {
    expect(interestFor(-30, economy)).toBe(0);
  });
});

describe('回合收入', () => {
  it('基础 + 利息 + 连胜奖励', () => {
    expect(roundIncome(10, 2, 0, economy)).toEqual({
      base: 5,
      interest: 1,
      streakBonus: economy.winBonus,
      total: 5 + 1 + economy.winBonus,
    });
  });

  it('连败也有补贴', () => {
    expect(roundIncome(10, 0, 3, economy).streakBonus).toBe(economy.lossBonus);
  });

  it('没有连胜连败时没有额外奖励', () => {
    expect(roundIncome(0, 0, 0, economy).streakBonus).toBe(0);
  });
});

describe('升级与上阵位', () => {
  it('升级费用按等级索引；满级返回 null', () => {
    expect(levelUpCost(1, leveling)).toBe(2);
    expect(levelUpCost(2, leveling)).toBe(4);
    expect(levelUpCost(3, leveling)).toBeNull();
  });

  it('上阵位按等级查表并夹紧越界等级', () => {
    expect(boardSlots(1, board)).toBe(3);
    expect(boardSlots(3, board)).toBe(5);
    expect(boardSlots(0, board)).toBe(3);
    expect(boardSlots(99, board)).toBe(5);
  });
});
