/**
 * 经济规则：利息、回合收入、升级费用、上阵位。
 *
 * 这些函数是纯函数，参数从 content/config/balance.json 来；数值调整找内容作者，别改代码。
 */

import type { BalanceConfig } from '../content/schema';

export function interestFor(gold: number, economy: BalanceConfig['economy']): number {
  const raw = Math.floor(gold / 10) * economy.interestPerTen;
  return Math.min(economy.maxInterestPerRound, Math.max(0, raw));
}

export interface RoundIncome {
  readonly base: number;
  readonly interest: number;
  readonly streakBonus: number;
  readonly total: number;
}

export function roundIncome(
  gold: number,
  streakWins: number,
  streakLosses: number,
  economy: BalanceConfig['economy'],
): RoundIncome {
  const base = economy.baseIncome;
  const interest = interestFor(gold, economy);
  const streakBonus =
    streakWins > 0 ? economy.winBonus : streakLosses > 0 ? economy.lossBonus : 0;
  return { base, interest, streakBonus, total: base + interest + streakBonus };
}

/** 升到下一级的费用；已满级返回 null。 */
export function levelUpCost(level: number, leveling: BalanceConfig['leveling']): number | null {
  if (level >= leveling.maxLevel) return null;
  return leveling.upgradeCosts[level - 1] ?? null;
}

/** 当前等级能上阵的干员数量。 */
export function boardSlots(level: number, board: BalanceConfig['board']): number {
  const index = Math.max(0, Math.min(board.slotsByLevel.length - 1, level - 1));
  return board.slotsByLevel[index] ?? 0;
}
