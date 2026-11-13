/**
 * 一局的入口与「意图 → 新状态」的动作集合。
 *
 * 所有动作都是纯函数：`(state, content, 参数) -> ActionResult`。UI 只调用这些动作，
 * 不直接改状态；以后接联机时，服务端校验的也是同一批动作。
 *
 * 失败的动作返回 `ok: false` 且 `state` 原样返回——UI 只需展示 message，不用处理异常。
 */

import type { GridMap, Direction } from '../core/grid';
import { createRng } from '../core/rng';
import type { ContentBundle } from '../content/schema';
import { checkPlacement } from './board';
import type { BattleSimulator, BattleSpec, BattleUnit } from './battle';
import { levelUpCost, roundIncome } from './economy';
import { autoMerge } from './merge';
import { rollShop } from './shop';
import type { OperatorInstance, Phase, RunState } from './state';

export interface ActionResult {
  readonly ok: boolean;
  /** 成功时是新状态；失败时是原状态（引用不变）。 */
  readonly state: RunState;
  readonly message: string;
}

function ok(state: RunState, message: string): ActionResult {
  return { ok: true, state, message };
}

function fail(state: RunState, message: string): ActionResult {
  return { ok: false, state, message };
}

/** 只允许在休整期做运营操作。 */
function requirePrep(state: RunState): ActionResult | null {
  if (state.phase === 'prep') return null;
  return fail(state, '只有休整期才能做这个操作');
}

export function createRunState(content: ContentBundle, seed = 20261113): RunState {
  const rng = createRng(seed);
  const base: RunState = {
    seed,
    rngState: rng.state(),
    round: 1,
    phase: 'prep',
    gold: content.config.economy.startingGold,
    level: 1,
    hp: content.config.run.startingHp,
    maxHp: content.config.run.startingHp,
    streakWins: 0,
    streakLosses: 0,
    shop: [],
    shopLocked: false,
    bench: Array.from({ length: content.config.bench.slots }, () => null),
    units: {},
    board: [],
    nextUid: 1,
    lastBattle: null,
  };
  return rollShop(base, content);
}

export function refreshShop(state: RunState, content: ContentBundle): ActionResult {
  const blocked = requirePrep(state);
  if (blocked !== null) return blocked;
  const cost = content.config.shop.refreshCost;
  if (state.gold < cost) return fail(state, `金币不足：刷新商店需要 ${cost}`);
  return ok(rollShop({ ...state, gold: state.gold - cost }, content), `刷新商店（-${cost} 金币）`);
}

export function levelUp(state: RunState, content: ContentBundle): ActionResult {
  const blocked = requirePrep(state);
  if (blocked !== null) return blocked;
  const cost = levelUpCost(state.level, content.config.leveling);
  if (cost === null) return fail(state, '调度中心已满级');
  if (state.gold < cost) return fail(state, `金币不足：升到 Lv${state.level + 1} 需要 ${cost}`);
  return ok(
    { ...state, gold: state.gold - cost, level: state.level + 1 },
    `调度中心升到 Lv${state.level + 1}（-${cost} 金币）`,
  );
}

export function toggleShopLock(state: RunState): ActionResult {
  return ok(
    { ...state, shopLocked: !state.shopLocked },
    state.shopLocked ? '已取消冻结商店' : '已冻结商店',
  );
}

export function buyShopSlot(
  state: RunState,
  content: ContentBundle,
  slotIndex: number,
): ActionResult {
  const blocked = requirePrep(state);
  if (blocked !== null) return blocked;

  const operatorId = state.shop[slotIndex] ?? null;
  if (operatorId === null) return fail(state, '这个商店格是空的');

  const def = content.operators.find((operator) => operator.id === operatorId);
  if (def === undefined) return fail(state, `商店里的干员 ${operatorId} 不在内容数据里`);
  if (state.gold < def.deployCost) {
    return fail(state, `金币不足：招募 ${def.name} 需要 ${def.deployCost}`);
  }

  const benchIndex = state.bench.findIndex((slot) => slot === null);
  if (benchIndex < 0) return fail(state, '整备区已满，先上场或出售一个干员');

  const uid = `u${state.nextUid}`;
  const instance: OperatorInstance = { uid, operatorId, star: 1 };
  const next: RunState = {
    ...state,
    gold: state.gold - def.deployCost,
    shop: state.shop.map((slot, index) => (index === slotIndex ? null : slot)),
    bench: state.bench.map((slot, index) => (index === benchIndex ? uid : slot)),
    units: { ...state.units, [uid]: instance },
    nextUid: state.nextUid + 1,
  };
  return ok(autoMerge(next), `招募 ${def.name}（-${def.deployCost} 金币）`);
}

export function sellBenchSlot(
  state: RunState,
  content: ContentBundle,
  benchIndex: number,
): ActionResult {
  const blocked = requirePrep(state);
  if (blocked !== null) return blocked;

  const uid = state.bench[benchIndex] ?? null;
  if (uid === null) return fail(state, '这个整备位是空的');
  const unit = state.units[uid];
  if (unit === undefined) return fail(state, '整备位数据与干员实例不同步');

  const def = content.operators.find((operator) => operator.id === unit.operatorId);
  const refund = Math.floor(
    (def?.deployCost ?? 0) * unit.star * content.config.economy.sellRefundRatio,
  );
  const units = { ...state.units };
  delete units[uid];

  return ok(
    {
      ...state,
      gold: state.gold + refund,
      bench: state.bench.map((slot, index) => (index === benchIndex ? null : slot)),
      units,
      board: state.board.filter((placement) => placement.uid !== uid),
    },
    `出售 ${def?.name ?? unit.operatorId}（+${refund} 金币）`,
  );
}

export function placeBenchUnit(
  state: RunState,
  content: ContentBundle,
  map: GridMap,
  benchIndex: number,
  at: { readonly col: number; readonly row: number },
  facing: Direction = 'down',
): ActionResult {
  const blocked = requirePrep(state);
  if (blocked !== null) return blocked;

  const uid = state.bench[benchIndex] ?? null;
  if (uid === null) return fail(state, '这个整备位是空的');

  const check = checkPlacement(state, map, content.config, at);
  if (!check.ok) return fail(state, check.reason);

  return ok(
    {
      ...state,
      bench: state.bench.map((slot, index) => (index === benchIndex ? null : slot)),
      board: [...state.board, { uid, at, facing }],
    },
    `已部署到 (${at.col}, ${at.row})`,
  );
}

/**
 * 推进阶段：
 * - prep → 跑一次战斗，进入 settle（目标生命归零则直接 finished）；
 * - settle → 发收入，进入下一回合的 prep；最后一回合结束则 finished。
 */
export function advancePhase(
  state: RunState,
  content: ContentBundle,
  map: GridMap,
  battle: BattleSimulator,
): ActionResult {
  if (state.phase === 'prep') {
    const units: BattleUnit[] = [];
    for (const placement of state.board) {
      const unit = state.units[placement.uid];
      if (unit === undefined) continue;
      units.push({
        uid: unit.uid,
        operatorId: unit.operatorId,
        star: unit.star,
        at: placement.at,
        facing: placement.facing,
      });
    }

    const spec: BattleSpec = {
      map,
      round: state.round,
      seed: state.seed,
      units,
      waves: content.waves,
    };
    const report = battle.simulate(spec);
    const hp = Math.max(0, state.hp - report.damage);
    const phase: Phase = hp <= 0 ? 'finished' : 'settle';
    const summary =
      report.leaked > 0
        ? `作战结束：漏怪 ${report.leaked}，目标生命 -${report.damage}`
        : '作战结束：本轮完美防守';
    return ok({ ...state, phase, hp, lastBattle: report }, summary);
  }

  if (state.phase === 'settle') {
    const income = roundIncome(
      state.gold,
      state.streakWins,
      state.streakLosses,
      content.config.economy,
    );
    const won = (state.lastBattle?.damage ?? 0) === 0;
    const streakWins = won ? state.streakWins + 1 : 0;
    const streakLosses = won ? 0 : state.streakLosses + 1;

    if (state.round >= content.config.round.total) {
      return ok(
        {
          ...state,
          phase: 'finished',
          gold: state.gold + income.total,
          streakWins,
          streakLosses,
        },
        `整局结束：最终目标生命 ${state.hp}`,
      );
    }

    const nextRound = state.round + 1;
    const next = rollShop(
      {
        ...state,
        phase: 'prep',
        round: nextRound,
        gold: state.gold + income.total,
        streakWins,
        streakLosses,
        lastBattle: null,
      },
      content,
    );
    return ok(
      next,
      `第 ${nextRound} 回合开始（+${income.total} 金币：基础 ${income.base} + 利息 ${income.interest} + 连胜/败 ${income.streakBonus}）`,
    );
  }

  return fail(state, '当前阶段不能推进');
}
