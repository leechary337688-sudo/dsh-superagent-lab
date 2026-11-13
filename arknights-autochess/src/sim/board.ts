/**
 * 棋盘摆放规则：可部署格、占用、上阵位数量、朝向。
 *
 * 敌人生成/寻路/攻击判定属于战斗解算（M1），这里只管「休整期能不能把干员放上去」。
 */

import { directionBetween, inBounds, isDeployable, type Direction, type GridCoord, type GridMap } from '../core/grid';
import type { BalanceConfig } from '../content/schema';
import { boardSlots } from './economy';
import type { RunState } from './state';

export interface PlacementCheck {
  readonly ok: boolean;
  readonly reason: string;
}

export function boardCapacity(level: number, config: BalanceConfig): number {
  return boardSlots(level, config.board);
}

export function isOccupied(state: RunState, coord: GridCoord): boolean {
  return state.board.some(
    (placement) => placement.at.col === coord.col && placement.at.row === coord.row,
  );
}

export function checkPlacement(
  state: RunState,
  map: GridMap,
  config: BalanceConfig,
  coord: GridCoord,
): PlacementCheck {
  if (!inBounds(map, coord)) {
    return { ok: false, reason: `坐标 (${coord.col}, ${coord.row}) 超出棋盘` };
  }
  if (!isDeployable(map, coord)) {
    return { ok: false, reason: `(${coord.col}, ${coord.row}) 不是可部署格` };
  }
  if (isOccupied(state, coord)) {
    return { ok: false, reason: `(${coord.col}, ${coord.row}) 已经有干员` };
  }
  const capacity = boardCapacity(state.level, config);
  if (state.board.length >= capacity) {
    return { ok: false, reason: `上阵位已满（${capacity}）` };
  }
  return { ok: true, reason: '' };
}

/** 从「站在 from 打 to」推出朝向；同格时默认朝下（敌人大致从上方来）。 */
export function facingToward(from: GridCoord, to: GridCoord): Direction {
  return directionBetween(from, to) ?? 'down';
}
