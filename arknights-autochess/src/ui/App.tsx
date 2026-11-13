import { useEffect, useState } from 'preact/hooks';
import type { GameSession } from '../app/session';
import type { ContentBundle } from '../content/schema';
import type { ActionResult } from '../sim/run';
import type { RunState } from '../sim/state';
import { BenchPanel } from './BenchPanel';
import { Hud } from './Hud';
import { ShopPanel } from './ShopPanel';
import { SynergyPanel } from './SynergyPanel';

export interface AppProps {
  session: GameSession;
}

/**
 * 只有一个根组件：订阅 session 的状态快照并重渲染。
 * 棋盘由 main.ts 里的 Pixi 渲染器负责，`.board-host` 是它的挂载点。
 */
export function App({ session }: AppProps) {
  const [state, setState] = useState<RunState>(() => session.getState());
  const [message, setMessage] = useState('框架已就绪：游戏内容待添加（M0）');

  useEffect(() => {
    return session.subscribe(() => setState(session.getState()));
  }, [session]);

  const act = (run: () => ActionResult): void => {
    const result = run();
    setMessage(result.message);
  };

  const content: ContentBundle = session.getContent();

  return (
    <div class="app">
      <Hud
        state={state}
        totalRounds={content.config.round.total}
        onAdvance={() => act(() => session.advancePhase())}
      />

      <div class="main">
        <SynergyPanel state={state} content={content} />

        <section class="board-area">
          <div class="board-host" />
          <p class="board-caption">
            占位战场 <code>content/maps/demo-board.json</code> · 底部三行为部署格 · 正式战场待设计
          </p>
        </section>

        <ShopPanel
          state={state}
          content={content}
          onRefresh={() => act(() => session.refreshShop())}
          onLevelUp={() => act(() => session.levelUp())}
          onToggleLock={() => act(() => session.toggleShopLock())}
          onBuy={(index) => act(() => session.buyShopSlot(index))}
        />
      </div>

      <BenchPanel state={state} content={content} />

      <footer class="status-line">{message}</footer>
    </div>
  );
}
