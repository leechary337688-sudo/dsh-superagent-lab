/**
 * 一局游戏的状态。
 *
 * 全部字段是纯数据（可 JSON 序列化），不持有类实例、DOM 或渲染对象：
 * 这样 sim 可以在 Node 里跑测试、以后也可以在服务端跑、还可以整局存档/断线重连。
 *
 * 修改状态的方式是「产生新对象」（见 `sim/run.ts` 里的 action），而不是原地 mutate：
 * UI 每次拿到新快照就能重渲染，测试也好断言。
 */

import type { Direction, GridCoord } from '../core/grid';

/** 一局的阶段。v0：prep → settle → prep ……（作战由占位解算器瞬时完成）。 */
export type Phase = 'prep' | 'combat' | 'settle' | 'finished';

export interface OperatorInstance {
  /** 实例 id，形如 `u1`；同一种干员的每个实例 uid 不同。 */
  readonly uid: string;
  /** 对应 content/operators/<id>.json 的 id。 */
  readonly operatorId: string;
  /** 星级：1 星 → 3 星（三方合一升一星）。 */
  readonly star: 1 | 2 | 3;
}

export interface BoardPlacement {
  readonly uid: string;
  readonly at: GridCoord;
  readonly facing: Direction;
}

/** 一次作战的结算报告。字段先按最小可用集合定，M1 战斗解算接入后按需扩展。 */
export interface BattleReport {
  readonly round: number;
  /** 漏过去的敌人数量。 */
  readonly leaked: number;
  /** 本回合扣除的目标生命值。 */
  readonly damage: number;
  /** 战斗持续 tick 数（30 tick = 1 秒）。 */
  readonly ticks: number;
  readonly notes: readonly string[];
}

export interface RunState {
  readonly seed: number;
  /** mulberry32 的内部状态；和状态一起序列化，回放就是确定的。 */
  rngState: number;
  /** 当前回合，从 1 开始。 */
  round: number;
  phase: Phase;
  gold: number;
  /** 调度中心等级（商店等级）。 */
  level: number;
  hp: number;
  maxHp: number;
  streakWins: number;
  streakLosses: number;
  /** 商店格子里的干员定义 id；null 表示空格。 */
  shop: readonly (string | null)[];
  shopLocked: boolean;
  /** 整备区格子，存 OperatorInstance.uid；null 表示空位。 */
  bench: readonly (string | null)[];
  /** 拥有的干员实例，按 uid 索引。 */
  units: Readonly<Record<string, OperatorInstance>>;
  board: readonly BoardPlacement[];
  /** 下一个可用的实例编号，保证 uid 稳定且可预测（方便测试/回放）。 */
  nextUid: number;
  lastBattle: BattleReport | null;
}
