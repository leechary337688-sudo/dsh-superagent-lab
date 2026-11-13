/**
 * 内容数据的类型定义（唯一事实来源）。
 *
 * 约定：
 * - 这里只定义「数据长什么样」，不写规则逻辑；规则在 `src/sim/`。
 * - 所有实体都有稳定的字符串 `id`；跨文件引用用 id，不用 index。
 * - 字段宁可多留可选扩展位，也不要为了一个玩法把结构改得面目全非——schemaVersion 用来兜底。
 */

import type { TileFlag, TileKind } from '../core/grid';

export const CONTENT_SCHEMA_VERSION = 1;

/** 方舟的八大职业；数据里写英文代码，UI 显示中文在 `src/ui/labels.ts`。 */
export type Profession =
  | 'vanguard'
  | 'guard'
  | 'defender'
  | 'sniper'
  | 'caster'
  | 'medic'
  | 'supporter'
  | 'specialist';

export const PROFESSIONS: readonly Profession[] = [
  'vanguard',
  'guard',
  'defender',
  'sniper',
  'caster',
  'medic',
  'supporter',
  'specialist',
];

/** 稀有度：1–6 星。 */
export type Rarity = 1 | 2 | 3 | 4 | 5 | 6;

export const RARITIES: readonly Rarity[] = [1, 2, 3, 4, 5, 6];

/**
 * 全局规则参数。这是「规则」而不是「内容」，但同样走数据驱动：
 * 调经济、调升级费、调商店概率不应该改代码。
 */
export interface BalanceConfig {
  readonly schemaVersion: number;
  readonly round: {
    /** 一局总回合数。 */
    readonly total: number;
    /** 休整期时长（秒），只影响 UI 计时，不影响 sim 结果。 */
    readonly prepSeconds: number;
  };
  readonly economy: {
    readonly startingGold: number;
    /** 每回合基础收入。 */
    readonly baseIncome: number;
    /** 每 10 金币的利息。 */
    readonly interestPerTen: number;
    /** 单回合利息上限。 */
    readonly maxInterestPerRound: number;
    /** 连胜额外收入。 */
    readonly winBonus: number;
    /** 连败额外收入（自走棋常见：连败也有补贴）。 */
    readonly lossBonus: number;
    /** 出售返还比例；1 表示原价退回。 */
    readonly sellRefundRatio: number;
  };
  readonly leveling: {
    /** 调度中心（商店等级）最高等级。 */
    readonly maxLevel: number;
    /** 升到下一级的费用，长度应为 maxLevel - 1。 */
    readonly upgradeCosts: readonly number[];
  };
  readonly shop: {
    /** 商店格子数。 */
    readonly slots: number;
    /** 手动刷新费用。 */
    readonly refreshCost: number;
    /** 按等级（index = level - 1）的稀有度权重，每行长度 6，对应 1–6 星。 */
    readonly oddsByLevel: readonly (readonly number[])[];
  };
  readonly bench: {
    /** 整备区格子数。 */
    readonly slots: number;
  };
  readonly board: {
    /** 按等级（index = level - 1）的上阵位数量。 */
    readonly slotsByLevel: readonly number[];
  };
  readonly run: {
    /** 目标生命初始值。 */
    readonly startingHp: number;
  };
}

/** 干员定义。数值只是骨架，正式数值等设计确定后再填。 */
export interface OperatorDef {
  readonly id: string;
  readonly name: string;
  readonly rarity: Rarity;
  readonly profession: Profession;
  /** 阵营/势力（对应方舟的「势力」），用于盟约判定。 */
  readonly factions?: readonly string[];
  /** 自由标签（远程/近战/召唤/元素……），给盟约和 AI 用。 */
  readonly tags?: readonly string[];
  /** 阻挡数；0 表示不阻挡。 */
  readonly block: number;
  /** 攻击范围（格），具体形状在 M1 的战斗解算里定义。 */
  readonly attackRange: number;
  /** 商店招募价格。 */
  readonly deployCost: number;
  readonly hp: number;
  readonly atk: number;
  readonly def: number;
  /** 攻击间隔（tick，30 tick = 1 秒），缺省由战斗解算取默认值。 */
  readonly attackIntervalTicks?: number;
  /** 技能 id 引用。 */
  readonly skillIds?: readonly string[];
  /** 盟约 id 引用。 */
  readonly synergyIds?: readonly string[];
}

export interface SkillDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** 冷却（tick）。 */
  readonly cooldownTicks?: number;
  /** 初始技力 / 消耗等扩展字段。 */
  readonly [extension: string]: unknown;
}

/**
 * 盟约（对应云顶之弈的「羁绊」/ 卫戍协议的「盟约」）。
 * 例如「深海猎人 x3 激活第一层，x5 激活第二层」。
 */
export interface SynergyDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** 激活阈值，升序；长度与层数一致。 */
  readonly thresholds: readonly number[];
}

/** 装备/道具。 */
export interface ItemDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** 合成配方（引用其他装备 id）；空表示基础装备。 */
  readonly recipe?: readonly string[];
}

/** 敌人定义。 */
export interface EnemyDef {
  readonly id: string;
  readonly name: string;
  readonly hp: number;
  readonly atk: number;
  readonly def: number;
  /** 移动速度（格/秒）。 */
  readonly speed: number;
  readonly flying?: boolean;
  readonly tags?: readonly string[];
}

/** 一次刷怪：某个入口放多少个什么敌人。 */
export interface EnemySpawnDef {
  readonly enemyId: string;
  readonly count: number;
  /** 连续出怪的间隔（tick）。 */
  readonly intervalTicks?: number;
  /** 用地图上第几个 spawn 点（按行优先顺序），缺省轮换。 */
  readonly spawnIndex?: number;
}

export interface WaveRoundDef {
  readonly round: number;
  readonly enemies: readonly EnemySpawnDef[];
}

/** 一套波次表，可以按难度/地图挂多套。 */
export interface WaveDef {
  readonly id: string;
  readonly name: string;
  readonly rounds: readonly WaveRoundDef[];
}

export interface LegendEntry {
  readonly kind: TileKind;
  readonly flags?: readonly TileFlag[];
}

/**
 * 战场定义：ASCII 布局 + 图例。
 *
 * `layout` 每行长度必须等于 `cols`，行数等于 `rows`。字符含义由 `legend` 给出；
 * 用字符画地图比手写坐标数组直观，review 时一眼能看出形状。
 */
export interface MapDef {
  readonly id: string;
  readonly name: string;
  readonly cols: number;
  readonly rows: number;
  readonly legend: Readonly<Record<string, LegendEntry>>;
  readonly layout: readonly string[];
}

/** 加载器产出的完整内容包。sim 只依赖这个结构，不关心 JSON 文件怎么组织。 */
export interface ContentBundle {
  readonly config: BalanceConfig;
  readonly operators: readonly OperatorDef[];
  readonly skills: readonly SkillDef[];
  readonly synergies: readonly SynergyDef[];
  readonly items: readonly ItemDef[];
  readonly enemies: readonly EnemyDef[];
  readonly waves: readonly WaveDef[];
  readonly maps: readonly MapDef[];
}
