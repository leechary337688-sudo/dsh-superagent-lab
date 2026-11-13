import type { ContentBundle } from '../content/schema';
import type { RunState } from '../sim/state';

export interface SynergyPanelProps {
  state: RunState;
  content: ContentBundle;
}

export function SynergyPanel({ state, content }: SynergyPanelProps) {
  const owned = Object.keys(state.units).length;

  return (
    <aside class="panel synergy-panel">
      <div class="panel-head">
        <h2>盟约</h2>
        <span class="muted">{content.synergies.length} 个</span>
      </div>

      {content.synergies.length === 0 ? (
        <p class="panel-empty">
          暂无盟约数据。
          <br />
          放 <code>content/synergies/*.json</code> 后，这里会按在场干员列出激活层数。
        </p>
      ) : (
        <ul class="synergy-list">
          {content.synergies.map((synergy) => (
            <li key={synergy.id}>
              <span class="slot-name">{synergy.name}</span>
              <span class="slot-meta">阈值 {synergy.thresholds.join(' / ')}</span>
            </li>
          ))}
        </ul>
      )}

      <p class="panel-foot">
        在场 {state.board.length} 名 · 持有 {owned} 名
      </p>
    </aside>
  );
}
