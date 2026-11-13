import { describe, expect, it } from 'vitest';
import { loadContent } from '../../src/content/loader';
import { deployableCoords, findTiles, parseMap } from '../../src/content/map';

describe('真实 content/ 数据', () => {
  it('能加载并通过校验（M0 内容为空是允许的）', () => {
    const content = loadContent();
    expect(content.maps.length).toBeGreaterThanOrEqual(1);
    expect(content.maps[0]?.id).toBe('demo-board');
    expect(content.operators).toEqual([]);
    expect(content.skills).toEqual([]);
    expect(content.synergies).toEqual([]);
    expect(content.enemies).toEqual([]);
    expect(content.waves).toEqual([]);
  });

  it('demo 战场：12×7、3 行共 30 个部署格、2 个入口、1 个目标', () => {
    const content = loadContent();
    const map = parseMap(content.maps[0]!);
    expect(map.cols).toBe(12);
    expect(map.rows).toBe(7);
    expect(map.tiles).toHaveLength(12 * 7);
    expect(deployableCoords(map)).toHaveLength(30);
    expect(findTiles(map, 'spawn')).toHaveLength(2);
    expect(findTiles(map, 'goal')).toHaveLength(1);
  });

  it('地图加载器拒绝 legend 之外的字符', () => {
    expect(() =>
      parseMap({
        id: 'bad',
        name: '坏地图',
        cols: 2,
        rows: 1,
        legend: { '#': { kind: 'wall' } },
        layout: ['?X'],
      }),
    ).toThrowError(/legend/);
  });
});
