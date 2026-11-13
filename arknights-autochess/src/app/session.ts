/**
 * 会话：把 sim 状态、内容、渲染和 UI 串起来。
 *
 * 这是表现层唯一的「写入口」：UI 调用 session 的意图方法 → sim 产生新状态 →
 * 通知订阅者（render / UI 重渲染）。渲染层只读 `getState()`，不反向修改。
 */

import type { GridMap } from '../core/grid';
import type { ContentBundle } from '../content/schema';
import { createPlaceholderBattle, type BattleSimulator } from '../sim/battle';
import {
  advancePhase,
  buyShopSlot,
  createRunState,
  levelUp,
  refreshShop,
  sellBenchSlot,
  toggleShopLock,
  type ActionResult,
} from '../sim/run';
import type { RunState } from '../sim/state';

type Listener = () => void;

export class GameSession {
  private state: RunState;
  private readonly battle: BattleSimulator = createPlaceholderBattle();
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly content: ContentBundle,
    private readonly map: GridMap,
    seed?: number,
  ) {
    this.state = createRunState(content, seed);
  }

  getState(): RunState {
    return this.state;
  }

  getContent(): ContentBundle {
    return this.content;
  }

  getMap(): GridMap {
    return this.map;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private commit(result: ActionResult): ActionResult {
    if (result.ok) {
      this.state = result.state;
      for (const listener of this.listeners) listener();
    }
    return result;
  }

  refreshShop(): ActionResult {
    return this.commit(refreshShop(this.state, this.content));
  }

  levelUp(): ActionResult {
    return this.commit(levelUp(this.state, this.content));
  }

  toggleShopLock(): ActionResult {
    return this.commit(toggleShopLock(this.state));
  }

  buyShopSlot(slotIndex: number): ActionResult {
    return this.commit(buyShopSlot(this.state, this.content, slotIndex));
  }

  sellBenchSlot(benchIndex: number): ActionResult {
    return this.commit(sellBenchSlot(this.state, this.content, benchIndex));
  }

  advancePhase(): ActionResult {
    return this.commit(advancePhase(this.state, this.content, this.map, this.battle));
  }
}
