/**
 * 把 content/maps 里的 ASCII 地图定义转换成逻辑层使用的 `GridMap`。
 *
 * JSON 里写的是字符画，这里做一次转换 + 基础断言；完整校验在 `validate.ts`。
 */

import type { GridCoord, GridMap, GridTile, TileFlag } from '../core/grid';
import { indexOf, tileAt, hasFlag, allCoords } from '../core/grid';
import type { MapDef } from './schema';

export function parseMap(def: MapDef): GridMap {
  const tiles: GridTile[] = [];

  for (let row = 0; row < def.rows; row += 1) {
    const line = def.layout[row] ?? '';
    for (let col = 0; col < def.cols; col += 1) {
      const char = line.charAt(col);
      const entry = def.legend[char];
      if (entry === undefined) {
        throw new Error(`地图 ${def.id} 在 (${col}, ${row}) 使用了 legend 里没有的字符 "${char}"`);
      }
      tiles.push({ kind: entry.kind, flags: entry.flags ?? [] });
    }
  }

  return { id: def.id, name: def.name, cols: def.cols, rows: def.rows, tiles };
}

export function findTiles(map: GridMap, flag: TileFlag): GridCoord[] {
  const found: GridCoord[] = [];
  for (const coord of allCoords(map)) {
    if (hasFlag(tileAt(map, coord), flag)) found.push(coord);
  }
  return found;
}

export function deployableCoords(map: GridMap): GridCoord[] {
  return findTiles(map, 'deployable');
}

/** 地图上某个格子的线性下标，渲染层画图时用。 */
export function tileIndex(map: GridMap, coord: GridCoord): number {
  return indexOf(coord.col, coord.row, map.cols);
}
