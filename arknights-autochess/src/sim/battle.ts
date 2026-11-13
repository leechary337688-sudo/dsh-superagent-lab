/**
 * 战斗解算的接口与占位实现。
 *
 * 真正的战斗（阻挡、朝向/攻击范围、技能自动释放、寻路、波次）是 M1 的核心工作量。
 * 这里先定契约：sim 只通过 `BattleSimulator` 调战斗，接真实解算时不必改回合流程。
 *
 * 设计取向参考成熟的确定性模拟做法：固定 tick、种子随机、只依赖 sim 状态；
 * 前端表现层只读回放数据，不参与判定。
 */

import type { Direction, GridCoord, GridMap } from '../core/grid';
import type { WaveDef } from '../content/schema';
import type { BattleReport } from './state';

export type { BattleReport } from './state';

export interface BattleUnit {
  readonly uid: string;
  readonly operatorId: string;
  readonly star: 1 | 2 | 3;
  readonly at: GridCoord;
  readonly facing: Direction;
}

export interface BattleSpec {
  readonly map: GridMap;
  readonly round: number;
  readonly seed: number;
  readonly units: readonly BattleUnit[];
  readonly waves: readonly WaveDef[];
}

export interface BattleSimulator {
  simulate(spec: BattleSpec): BattleReport;
}

/** M0 占位解算：完美防守，不扣血。M1 换成真正的战斗解算。 */
export function createPlaceholderBattle(): BattleSimulator {
  return {
    simulate(spec: BattleSpec): BattleReport {
      return {
        round: spec.round,
        leaked: 0,
        damage: 0,
        ticks: 0,
        notes: ['占位解算：战斗系统尚未实现（M1）'],
      };
    },
  };
}
