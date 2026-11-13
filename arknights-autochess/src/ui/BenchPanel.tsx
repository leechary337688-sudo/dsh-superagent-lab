import type { ContentBundle } from '../content/schema';
import type { RunState } from '../sim/state';
import { RARITY_LABELS } from './labels';

export interface BenchPanelProps {
  state: RunState;
  content: ContentBundle;
}

export function BenchPanel({ state, content }: BenchPanelProps) {
  const defs = new Map(content.operators.map((operator) => [operator.id, operator]));
  const used = state.bench.filter((slot) => slot !== null).length;

  return (
    <footer class="panel bench-panel">
      <div class="panel-head">
        <h2>整备区</h2>
        <span class="muted">
          {used}/{state.bench.length} · 点击商店招募，上阵摆放是 M1
        </span>
      </div>
      <div class="bench-slots">
        {state.bench.map((uid, index) => {
          const unit = uid === null ? undefined : state.units[uid];
          const def = unit === undefined ? undefined : defs.get(unit.operatorId);
          if (unit === undefined || def === undefined) {
            return (
              <div class="bench-slot" key={index}>
                <span class="slot-empty">空位</span>
              </div>
            );
          }
          return (
            <div class="bench-slot filled" key={index}>
              <span class="slot-name">{def.name}</span>
              <span class="slot-meta">
                {RARITY_LABELS[def.rarity]} · {'★'.repeat(unit.star)}
              </span>
            </div>
          );
        })}
      </div>
    </footer>
  );
}
