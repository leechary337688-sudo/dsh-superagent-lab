/**
 * 棋盘坐标与网格工具。
 *
 * 纯函数、零依赖，`sim` 和 `content` 共用。渲染层可以把这里的坐标换算成像素，
 * 但反过来不行：逻辑层不知道像素，也不应该知道。
 */

export interface GridCoord {
  readonly col: number;
  readonly row: number;
}

/** 干员朝向。方舟的远程单位只能打「面朝方向」一侧的格子，具体规则在战斗解算里做（M1）。 */
export type Direction = 'up' | 'down' | 'left' | 'right';

export type TileKind = 'void' | 'ground' | 'highGround' | 'wall';

/** 格子附带的语义标记：可部署、敌人入口、防守目标。 */
export type TileFlag = 'deployable' | 'spawn' | 'goal';

export interface GridTile {
  readonly kind: TileKind;
  readonly flags: readonly TileFlag[];
}

export interface GridMap {
  readonly id: string;
  readonly name: string;
  readonly cols: number;
  readonly rows: number;
  /** 行优先（row-major）：`tiles[row * cols + col]`。 */
  readonly tiles: readonly GridTile[];
}

export const TILE_GROUND: GridTile = { kind: 'ground', flags: [] };
export const TILE_WALL: GridTile = { kind: 'wall', flags: [] };
export const TILE_VOID: GridTile = { kind: 'void', flags: [] };

export function indexOf(col: number, row: number, cols: number): number {
  return row * cols + col;
}

export function coordFromIndex(index: number, cols: number): GridCoord {
  return { col: index % cols, row: Math.floor(index / cols) };
}

export function inBounds(map: GridMap, coord: GridCoord): boolean {
  return coord.col >= 0 && coord.col < map.cols && coord.row >= 0 && coord.row < map.rows;
}

export function tileAt(map: GridMap, coord: GridCoord): GridTile | undefined {
  if (!inBounds(map, coord)) return undefined;
  return map.tiles[indexOf(coord.col, coord.row, map.cols)];
}

export function hasFlag(tile: GridTile | undefined, flag: TileFlag): boolean {
  return tile !== undefined && tile.flags.includes(flag);
}

export function isDeployable(map: GridMap, coord: GridCoord): boolean {
  return hasFlag(tileAt(map, coord), 'deployable');
}

/** 敌人能不能走上去（墙和虚空格不行）。 */
export function isWalkable(map: GridMap, coord: GridCoord): boolean {
  const tile = tileAt(map, coord);
  return tile !== undefined && tile.kind !== 'void' && tile.kind !== 'wall';
}

export function neighbors4(coord: GridCoord): GridCoord[] {
  return [
    { col: coord.col, row: coord.row - 1 },
    { col: coord.col + 1, row: coord.row },
    { col: coord.col, row: coord.row + 1 },
    { col: coord.col - 1, row: coord.row },
  ];
}

export function manhattan(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

export function coordKey(coord: GridCoord): string {
  return `${coord.col},${coord.row}`;
}

export function parseCoordKey(key: string): GridCoord | undefined {
  const [colText, rowText] = key.split(',');
  const col = Number(colText);
  const row = Number(rowText);
  if (!Number.isInteger(col) || !Number.isInteger(row)) return undefined;
  return { col, row };
}

/** 从「站在 from 打 to」推出朝向；同一格或越界返回 undefined。 */
export function directionBetween(from: GridCoord, to: GridCoord): Direction | undefined {
  const dc = to.col - from.col;
  const dr = to.row - from.row;
  if (dc === 0 && dr === 0) return undefined;
  if (Math.abs(dc) >= Math.abs(dr)) return dc >= 0 ? 'right' : 'left';
  return dr >= 0 ? 'down' : 'up';
}

/** 遍历地图上的全部坐标（行优先），给渲染和校验用。 */
export function* allCoords(map: GridMap): Generator<GridCoord> {
  for (let row = 0; row < map.rows; row += 1) {
    for (let col = 0; col < map.cols; col += 1) {
      yield { col, row };
    }
  }
}
