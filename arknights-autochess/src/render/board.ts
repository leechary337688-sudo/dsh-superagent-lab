/**
 * PixiJS 棋盘渲染。
 *
 * 渲染层是「只读消费者」：拿到 sim 状态和地图，画出棋盘/部署格/入口/目标/干员。
 * 它不发指令、不写状态。M1 之后这里会加：敌人、攻击范围、特效、动画插值。
 *
 * 性能策略（当前阶段）：每次状态变化重画一次 Graphics。棋盘规模很小（十几×几），
 * 这样最简单；以后敌人/特效多了再换成对象池 + 脏标记。
 */

import { Application, Container, Graphics, Text } from 'pixi.js';
import type { GridMap, GridTile } from '../core/grid';
import { TILE_VOID, hasFlag } from '../core/grid';
import type { RunState } from '../sim/state';

export interface BoardRenderer {
  render(state: RunState, map: GridMap): void;
  destroy(): void;
}

const COLORS = {
  background: 0x0a0e14,
  ground: 0x1a232f,
  highGround: 0x24313f,
  wall: 0x0c1016,
  void: 0x06080c,
  deployable: 0x1c2d29,
  spawn: 0x3a2226,
  goal: 0x1b2b45,
  gridLine: 0x2b3947,
  unit: 0xf0b429,
  spawnMark: 0xff5d5d,
  goalMark: 0x5aa9ff,
} as const;

const UNIT_COLOR = 0xf0b429;

function tileColor(tile: GridTile): number {
  if (hasFlag(tile, 'spawn')) return COLORS.spawn;
  if (hasFlag(tile, 'goal')) return COLORS.goal;
  if (hasFlag(tile, 'deployable')) return COLORS.deployable;
  if (tile.kind === 'wall') return COLORS.wall;
  if (tile.kind === 'highGround') return COLORS.highGround;
  if (tile.kind === 'void') return COLORS.void;
  return COLORS.ground;
}

export async function createBoardRenderer(host: HTMLElement): Promise<BoardRenderer> {
  const app = new Application();
  await app.init({
    background: COLORS.background,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    resizeTo: host,
  });
  host.appendChild(app.canvas);

  const layer = new Container();
  app.stage.addChild(layer);
  const grid = new Graphics();
  const overlay = new Graphics();
  const title = new Text({
    text: '',
    style: { fill: 0x8ea3b8, fontSize: 13, fontFamily: 'Consolas, "Microsoft YaHei", monospace' },
  });
  const hint = new Text({
    text: '',
    style: { fill: 0x5d7187, fontSize: 12, fontFamily: '"Microsoft YaHei", sans-serif' },
  });
  hint.anchor.set(1, 0);
  layer.addChild(grid, overlay, title, hint);

  let lastState: RunState | null = null;
  let lastMap: GridMap | null = null;

  const draw = (): void => {
    const state = lastState;
    const map = lastMap;
    if (state === null || map === null) return;

    const width = app.screen.width;
    const height = app.screen.height;
    grid.clear();
    overlay.clear();

    const margin = 26;
    const tile = Math.max(
      12,
      Math.floor(Math.min((width - margin * 2) / map.cols, (height - margin * 2) / map.rows)),
    );
    const originX = Math.floor((width - tile * map.cols) / 2);
    const originY = Math.floor((height - tile * map.rows) / 2) + 4;

    for (let row = 0; row < map.rows; row += 1) {
      for (let col = 0; col < map.cols; col += 1) {
        const tileDef = map.tiles[row * map.cols + col] ?? TILE_VOID;
        const x = originX + col * tile;
        const y = originY + row * tile;
        const color = tileColor(tileDef);
        const alpha = tileDef.kind === 'void' ? 0.35 : 1;

        grid
          .rect(x + 1, y + 1, tile - 2, tile - 2)
          .fill({ color, alpha })
          .stroke({ width: 1, color: COLORS.gridLine, alpha: 0.55 });

        if (hasFlag(tileDef, 'spawn')) {
          overlay.circle(x + tile / 2, y + tile / 2, Math.max(2, tile * 0.12)).fill({
            color: COLORS.spawnMark,
            alpha: 0.9,
          });
        }
        if (hasFlag(tileDef, 'goal')) {
          const size = Math.max(4, tile * 0.36);
          overlay
            .rect(x + (tile - size) / 2, y + (tile - size) / 2, size, size)
            .fill({ color: COLORS.goalMark, alpha: 0.85 });
        }
      }
    }

    for (const placement of state.board) {
      const unit = state.units[placement.uid];
      if (unit === undefined) continue;
      const x = originX + placement.at.col * tile + tile / 2;
      const y = originY + placement.at.row * tile + tile / 2;
      overlay
        .circle(x, y, Math.max(4, tile * 0.3))
        .fill({ color: UNIT_COLOR, alpha: 0.95 })
        .stroke({ width: 2, color: COLORS.background });
    }

    title.text = map.name;
    title.position.set(originX, Math.max(4, originY - 22));
    hint.text = `回合 ${state.round} · 上阵 ${state.board.length} 名`;
    hint.position.set(originX + tile * map.cols, Math.max(4, originY - 22));
  };

  const onResize = (): void => draw();
  window.addEventListener('resize', onResize);

  return {
    render(state: RunState, map: GridMap): void {
      lastState = state;
      lastMap = map;
      draw();
    },
    destroy(): void {
      window.removeEventListener('resize', onResize);
      app.destroy(true, { children: true });
    },
  };
}
