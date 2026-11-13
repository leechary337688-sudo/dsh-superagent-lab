import { describe, expect, it } from 'vitest';
import { assertValidContent, validateContent } from '../../src/content/validate';
import type { OperatorDef } from '../../src/content/schema';
import { balanceFixture, makeContent, mapFixture, operatorFixtures } from '../fixtures/content';

const opA = operatorFixtures[0]!;
const opB = operatorFixtures[1]!;

describe('内容校验', () => {
  it('测试夹具本身是合法的', () => {
    const result = validateContent(makeContent());
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('重复 id 会被报出来', () => {
    const duplicate: OperatorDef = { ...opB, id: opA.id };
    const result = validateContent(makeContent({ operators: [opA, duplicate] }));
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('id 重复'))).toBe(true);
  });

  it('地图行宽与 cols 不一致会被报出来', () => {
    const result = validateContent(
      makeContent({ maps: [{ ...mapFixture, layout: ['#S..', '#...#'] }] }),
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('不一致'))).toBe(true);
  });

  it('地图没有部署格 / 入口 / 目标会被报出来', () => {
    const result = validateContent(
      makeContent({
        maps: [
          {
            ...mapFixture,
            layout: ['#####', '#####', '#####', '#####'],
          },
        ],
      }),
    );
    expect(result.issues.some((issue) => issue.message.includes('deployable'))).toBe(true);
    expect(result.issues.some((issue) => issue.message.includes('spawn'))).toBe(true);
    expect(result.issues.some((issue) => issue.message.includes('goal'))).toBe(true);
  });

  it('引用了不存在的技能会被报出来', () => {
    const result = validateContent(
      makeContent({ operators: [{ ...opA, skillIds: ['ghost_skill'] }] }),
    );
    expect(result.issues).toMatchObject([
      expect.objectContaining({ message: expect.stringContaining('ghost_skill') }),
    ]);
  });

  it('升级费用长度与 maxLevel 不匹配会被报出来', () => {
    const result = validateContent(
      makeContent({
        operators: [],
        config: {
          ...balanceFixture,
          leveling: { maxLevel: 4, upgradeCosts: [2, 4] },
        },
      }),
    );
    expect(result.issues.some((issue) => issue.message.includes('upgradeCosts'))).toBe(true);
  });

  it('没有地图会被报出来', () => {
    const result = validateContent(makeContent({ operators: [], maps: [] }));
    expect(result.issues.some((issue) => issue.message.includes('至少需要一张地图'))).toBe(true);
  });

  it('assertValidContent 失败时抛出带问题列表的错误', () => {
    expect(() => assertValidContent(makeContent({ maps: [] }))).toThrowError(/内容数据校验失败/);
  });
});
