/**
 * 三合一（同名同星级 3 个 → 升一星）。
 *
 * 立即合成，和自走棋的习惯一致；合成的「宿主」取 uid 最小的那个，保证结果可预测。
 * 被吃掉的实例从 `units` / `bench` / `board` 里一起清掉；宿主在棋盘上则原地保留。
 */

import type { OperatorInstance, RunState } from './state';

export const MERGE_COUNT = 3;

interface MergeGroup {
  readonly key: string;
  readonly uids: string[];
}

function groupUnits(units: Readonly<Record<string, OperatorInstance>>): MergeGroup[] {
  const groups = new Map<string, string[]>();
  for (const [uid, unit] of Object.entries(units)) {
    const key = `${unit.operatorId}#${unit.star}`;
    const list = groups.get(key) ?? [];
    list.push(uid);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([key, uids]) => ({ key, uids }));
}

export function autoMerge(state: RunState): RunState {
  const units: Record<string, OperatorInstance> = { ...state.units };
  let bench = [...state.bench];
  let board = [...state.board];

  for (;;) {
    let merged = false;
    for (const group of groupUnits(units)) {
      if (group.uids.length < MERGE_COUNT) continue;
      const baseUid = group.uids[0];
      if (baseUid === undefined) continue;
      const base = units[baseUid];
      if (base === undefined || base.star >= 3) continue;

      const consumed = group.uids.slice(0, MERGE_COUNT);
      for (const uid of consumed.slice(1)) {
        delete units[uid];
        bench = bench.map((slot) => (slot === uid ? null : slot));
        board = board.filter((placement) => placement.uid !== uid);
      }
      units[baseUid] = { ...base, star: (base.star + 1) as 1 | 2 | 3 };
      merged = true;
      break;
    }
    if (!merged) break;
  }

  return { ...state, units, bench, board };
}
