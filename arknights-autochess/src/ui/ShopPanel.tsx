import type { ContentBundle } from '../content/schema';
import { levelUpCost } from '../sim/economy';
import type { RunState } from '../sim/state';
import { PROFESSION_LABELS, RARITY_LABELS } from './labels';

export interface ShopPanelProps {
  state: RunState;
  content: ContentBundle;
  onRefresh: () => void;
  onLevelUp: () => void;
  onToggleLock: () => void;
  onBuy: (slotIndex: number) => void;
}

export function ShopPanel({
  state,
  content,
  onRefresh,
  onLevelUp,
  onToggleLock,
  onBuy,
}: ShopPanelProps) {
  const defs = new Map(content.operators.map((operator) => [operator.id, operator]));
  const upgradeCost = levelUpCost(state.level, content.config.leveling);
  const refreshCost = content.config.shop.refreshCost;

  return (
    <aside class="panel shop-panel">
      <div class="panel-head">
        <h2>商店</h2>
        <span class="muted">Lv{state.level} · 刷新 {refreshCost} 金</span>
      </div>

      <div class="shop-slots">
        {state.shop.map((operatorId, index) => {
          const def = operatorId === null ? undefined : defs.get(operatorId);
          return (
            <button
              key={index}
              class={`shop-slot${state.shopLocked ? ' locked' : ''}`}
              disabled={def === undefined}
              onClick={() => onBuy(index)}
              title={def === undefined ? '内容待添加：content/operators/' : `${def.name}`}
            >
              {def === undefined ? (
                <span class="slot-empty">空</span>
              ) : (
                <>
                  <span class="slot-name">{def.name}</span>
                  <span class="slot-meta">
                    {RARITY_LABELS[def.rarity]} · {PROFESSION_LABELS[def.profession]}
                  </span>
                  <span class="slot-cost">{def.deployCost} 金</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div class="panel-actions">
        <button class="btn" onClick={onRefresh} disabled={state.gold < refreshCost}>
          刷新商店（{refreshCost}）
        </button>
        <button
          class="btn"
          onClick={onLevelUp}
          disabled={upgradeCost === null || state.gold < upgradeCost}
        >
          {upgradeCost === null ? '调度中心已满级' : `升级调度中心（${upgradeCost}）`}
        </button>
        <button class="btn ghost" onClick={onToggleLock}>
          {state.shopLocked ? '取消冻结' : '冻结商店'}
        </button>
      </div>

      <p class="panel-foot">
        内容待添加：商店目前为空。干员写进 <code>content/operators/*.json</code> 后即可招募。
      </p>
    </aside>
  );
}
