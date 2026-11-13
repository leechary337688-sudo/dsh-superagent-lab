/**
 * 浏览器入口：加载内容 → 建会话 → 挂 UI → 起 Pixi 棋盘渲染。
 *
 * 启动顺序刻意写成「先校验内容、再渲染」：内容有错就直接显示在页面上，而不是黑屏。
 */

import './ui/style.css';
import { h, render } from 'preact';
import { GameSession } from './app/session';
import { loadContent } from './content/loader';
import { parseMap } from './content/map';
import { createBoardRenderer } from './render/board';
import { App } from './ui/App';

async function boot(): Promise<void> {
  const content = loadContent();
  const mapDef = content.maps[0];
  if (mapDef === undefined) throw new Error('content/maps/ 下至少需要一张地图');

  const session = new GameSession(content, parseMap(mapDef));

  const root = document.querySelector<HTMLElement>('#ui-root');
  if (root === null) throw new Error('index.html 缺少 #ui-root');
  render(h(App, { session }), root);

  const host = root.querySelector<HTMLElement>('.board-host');
  if (host === null) throw new Error('App 未渲染出 .board-host 挂载点');

  const renderer = await createBoardRenderer(host);
  const sync = (): void => renderer.render(session.getState(), session.getMap());
  session.subscribe(sync);
  sync();
}

void boot().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const root = document.querySelector<HTMLElement>('#ui-root');
  if (root !== null) {
    root.textContent = `启动失败：${message}`;
  }
  console.error(error);
});
