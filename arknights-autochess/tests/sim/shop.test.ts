import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { rarityWeights, rollRarity, rollShopSlots } from '../../src/sim/shop';
import { balanceFixture, makeContent } from '../fixtures/content';

const shop = balanceFixture.shop;
const content = makeContent();

describe('商店抽取', () => {
  it('等级权重按 level-1 索引，越界时夹紧', () => {
    expect(rarityWeights(1, shop)).toEqual([100, 0, 0, 0, 0, 0]);
    expect(rarityWeights(3, shop)).toEqual([40, 40, 20, 0, 0, 0]);
    expect(rarityWeights(0, shop)).toEqual([100, 0, 0, 0, 0, 0]);
    expect(rarityWeights(99, shop)).toEqual([40, 40, 20, 0, 0, 0]);
  });

  it('rollRarity 按权重落点；全 0 返回 null', () => {
    expect(rollRarity(createRng(1), [0, 0, 100, 0, 0, 0])).toBe(3);
    expect(rollRarity(createRng(1), [0, 100, 0, 0, 0, 0])).toBe(2);
    expect(rollRarity(createRng(1), [0, 0, 0, 0, 0, 0])).toBeNull();
  });

  it('1 级商店只能抽到 1 星（夹具里只有 op_a 是 1 星）', () => {
    const slots = rollShopSlots(content.operators, 1, shop, createRng(7));
    expect(slots).toHaveLength(shop.slots);
    expect(slots.every((id) => id === 'op_a')).toBe(true);
  });

  it('内容为空时返回全 null，游戏仍能启动', () => {
    const slots = rollShopSlots([], 1, shop, createRng(7));
    expect(slots).toEqual([null, null, null]);
  });

  it('同一种子得到同一商店（可回放）', () => {
    const a = rollShopSlots(content.operators, 2, shop, createRng(2026));
    const b = rollShopSlots(content.operators, 2, shop, createRng(2026));
    expect(a).toEqual(b);
  });
});
