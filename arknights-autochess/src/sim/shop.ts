/**
 * 商店：按等级权重抽稀有度，再在该稀有度里抽干员。
 *
 * v0 是「按稀有度均匀抽取」，不模拟卡池张数（共享卡池/剩余张数是 M2 的事）。
 * 内容为空时全部格子返回 null：游戏照样能启动，只是商店没东西可买。
 */

import { createRng, type Rng } from '../core/rng';
import type { BalanceConfig, ContentBundle, OperatorDef, Rarity } from '../content/schema';
import type { RunState } from './state';

/** 某个等级的稀有度权重（长度 6，对应 1–6 星）。 */
export function rarityWeights(
  level: number,
  shop: BalanceConfig['shop'],
): readonly number[] {
  const index = Math.max(0, Math.min(shop.oddsByLevel.length - 1, level - 1));
  return shop.oddsByLevel[index] ?? [];
}

export function rollRarity(rng: Rng, weights: readonly number[]): Rarity | null {
  const positive = weights.map((weight) => Math.max(0, weight));
  const total = positive.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return null;

  let roll = rng.next() * total;
  for (let index = 0; index < positive.length; index += 1) {
    roll -= positive[index] ?? 0;
    if (roll < 0) return (index + 1) as Rarity;
  }
  return positive.length as Rarity;
}

export function rollShopSlots(
  operators: readonly OperatorDef[],
  level: number,
  shop: BalanceConfig['shop'],
  rng: Rng,
  slotCount?: number,
): (string | null)[] {
  const weights = rarityWeights(level, shop);
  const byRarity = new Map<Rarity, OperatorDef[]>();
  for (const operator of operators) {
    const list = byRarity.get(operator.rarity) ?? [];
    list.push(operator);
    byRarity.set(operator.rarity, list);
  }

  const count = slotCount ?? shop.slots;
  const slots: (string | null)[] = [];
  for (let index = 0; index < count; index += 1) {
    const rarity = rollRarity(rng, weights);
    const candidates = rarity === null ? [] : (byRarity.get(rarity) ?? []);
    slots.push(rng.pick(candidates)?.id ?? null);
  }
  return slots;
}

/** 用状态里的 rngState 续上随机序列，返回新状态。 */
export function rollShop(state: RunState, content: ContentBundle): RunState {
  const rng = createRng(state.rngState);
  const shop = rollShopSlots(content.operators, state.level, content.config.shop, rng);
  return { ...state, shop, rngState: rng.state() };
}
