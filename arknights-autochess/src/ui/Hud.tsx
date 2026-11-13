import type { RunState } from '../sim/state';
import { PHASE_LABELS } from './labels';

export interface HudProps {
  state: RunState;
  totalRounds: number;
  onAdvance: () => void;
}

interface HudStatProps {
  label: string;
  value: string;
  tone?: 'gold' | 'danger';
}

function HudStat({ label, value, tone }: HudStatProps) {
  return (
    <div class={`hud-stat${tone === undefined ? '' : ` ${tone}`}`}>
      <span class="hud-stat-label">{label}</span>
      <span class="hud-stat-value">{value}</span>
    </div>
  );
}

export function Hud({ state, totalRounds, onAdvance }: HudProps) {
  const finished = state.phase === 'finished';
  const label = state.phase === 'prep' ? '开始作战' : state.phase === 'settle' ? '进入下一回合' : '整局结束';

  return (
    <header class="hud">
      <div class="hud-title">
        <span class="hud-logo">ARK</span>
        <span class="hud-sub">自走棋 · 框架预览</span>
      </div>
      <div class="hud-stats">
        <HudStat label="回合" value={`${state.round} / ${totalRounds}`} />
        <HudStat label="阶段" value={PHASE_LABELS[state.phase]} />
        <HudStat label="金币" value={String(state.gold)} tone="gold" />
        <HudStat label="调度中心" value={`Lv${state.level}`} />
        <HudStat label="目标生命" value={`${state.hp} / ${state.maxHp}`} tone={state.hp < 40 ? 'danger' : undefined} />
        <HudStat label="连胜 / 连败" value={`${state.streakWins} / ${state.streakLosses}`} />
      </div>
      <div class="hud-actions">
        <button class="btn primary" onClick={onAdvance} disabled={finished}>
          {label}
        </button>
      </div>
    </header>
  );
}
