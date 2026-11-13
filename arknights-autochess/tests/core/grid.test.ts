import { describe, expect, it } from 'vitest';
import {
  coordFromIndex,
  coordKey,
  directionBetween,
  indexOf,
  inBounds,
  isDeployable,
  isWalkable,
  manhattan,
  neighbors4,
  parseCoordKey,
  tileAt,
  TILE_WALL,
} from '../../src/core/grid';
import { parseMap } from '../../src/content/map';
import { mapFixture } from '../fixtures/content';

describe('网格工具', () => {
  it('indexOf / coordFromIndex 往返一致', () => {
    const cols = 5;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = indexOf(col, row, cols);
        expect(coordFromIndex(index, cols)).toEqual({ col, row });
      }
    }
  });

  it('inBounds 判断边界', () => {
    const map = parseMap(mapFixture);
    expect(inBounds(map, { col: 0, row: 0 })).toBe(true);
    expect(inBounds(map, { col: 4, row: 3 })).toBe(true);
    expect(inBounds(map, { col: -1, row: 0 })).toBe(false);
    expect(inBounds(map, { col: 0, row: 4 })).toBe(false);
  });

  it('tileAt 越界返回 undefined', () => {
    const map = parseMap(mapFixture);
    expect(tileAt(map, { col: 99, row: 99 })).toBeUndefined();
    expect(tileAt(map, { col: 0, row: 0 })?.kind).toBe('wall');
  });

  it('isDeployable 只认 deployable 格', () => {
    const map = parseMap(mapFixture);
    expect(isDeployable(map, { col: 1, row: 2 })).toBe(true);
    expect(isDeployable(map, { col: 1, row: 1 })).toBe(false);
  });

  it('isWalkable 排除墙和虚空', () => {
    const map = parseMap(mapFixture);
    expect(isWalkable(map, { col: 1, row: 1 })).toBe(true);
    expect(isWalkable(map, { col: 0, row: 0 })).toBe(false);
  });

  it('neighbors4 / manhattan', () => {
    expect(neighbors4({ col: 2, row: 2 })).toHaveLength(4);
    expect(manhattan({ col: 0, row: 0 }, { col: 3, row: 4 })).toBe(7);
  });

  it('directionBetween 推出朝向', () => {
    expect(directionBetween({ col: 2, row: 2 }, { col: 3, row: 2 })).toBe('right');
    expect(directionBetween({ col: 2, row: 2 }, { col: 1, row: 2 })).toBe('left');
    expect(directionBetween({ col: 2, row: 2 }, { col: 2, row: 1 })).toBe('up');
    expect(directionBetween({ col: 2, row: 2 }, { col: 2, row: 3 })).toBe('down');
    expect(directionBetween({ col: 2, row: 2 }, { col: 2, row: 2 })).toBeUndefined();
  });

  it('coordKey / parseCoordKey 往返一致', () => {
    const key = coordKey({ col: 3, row: 5 });
    expect(key).toBe('3,5');
    expect(parseCoordKey(key)).toEqual({ col: 3, row: 5 });
    expect(parseCoordKey('bad')).toBeUndefined();
  });

  it('墙格子没有 deployable 标记', () => {
    expect(TILE_WALL.flags).toEqual([]);
  });
});
