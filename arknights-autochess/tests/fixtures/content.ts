import type { BalanceConfig, ContentBundle, MapDef, OperatorDef } from '../../src/content/schema';

/**
 * 测试夹具：一套最小但合法的内容包。
 * 不放进 content/ 是因为它不是「游戏内容」，只是测试用数据。
 */

export const balanceFixture: BalanceConfig = {
  schemaVersion: 1,
  round: { total: 14, prepSeconds: 40 },
  economy: {
    startingGold: 10,
    baseIncome: 5,
    interestPerTen: 1,
    maxInterestPerRound: 5,
    winBonus: 1,
    lossBonus: 1,
    sellRefundRatio: 1,
  },
  leveling: { maxLevel: 3, upgradeCosts: [2, 4] },
  shop: {
    slots: 3,
    refreshCost: 2,
    oddsByLevel: [
      [100, 0, 0, 0, 0, 0],
      [70, 30, 0, 0, 0, 0],
      [40, 40, 20, 0, 0, 0],
    ],
  },
  bench: { slots: 5 },
  board: { slotsByLevel: [3, 4, 5] },
  run: { startingHp: 100 },
};

export const mapFixture: MapDef = {
  id: 'test-map',
  name: '测试地图',
  cols: 5,
  rows: 4,
  legend: {
    '#': { kind: 'wall' },
    '.': { kind: 'ground' },
    d: { kind: 'ground', flags: ['deployable'] },
    S: { kind: 'ground', flags: ['spawn'] },
    G: { kind: 'ground', flags: ['goal'] },
  },
  layout: ['#S..#', '#...#', '#ddd#', '#..G#'],
};

export const operatorFixtures: OperatorDef[] = [
  {
    id: 'op_a',
    name: '测试干员A',
    rarity: 1,
    profession: 'guard',
    block: 1,
    attackRange: 1,
    deployCost: 1,
    hp: 10,
    atk: 5,
    def: 0,
  },
  {
    id: 'op_b',
    name: '测试干员B',
    rarity: 3,
    profession: 'caster',
    block: 0,
    attackRange: 3,
    deployCost: 3,
    hp: 8,
    atk: 9,
    def: 0,
  },
];

export function makeContent(overrides: Partial<ContentBundle> = {}): ContentBundle {
  return {
    config: balanceFixture,
    operators: operatorFixtures,
    skills: [],
    synergies: [],
    items: [],
    enemies: [],
    waves: [],
    maps: [mapFixture],
    ...overrides,
  };
}
