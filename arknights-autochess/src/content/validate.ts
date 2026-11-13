/**
 * 内容数据校验。
 *
 * 目标：内容作者的错（写错 id、地图行宽不对、引用了不存在的技能）在启动/测试时立刻暴露，
 * 而不是等玩到一半才崩。校验只依赖数据类型，不依赖 sim。
 *
 * 用法：
 * - 启动时 `loadContent()` 会自动 `assertValidContent()`；
 * - 测试里 `tests/content/validate.test.ts` 校验真实的 content/ 目录；
 * - 以后接编辑器时，可以把 `issues` 直接显示在编辑面板里。
 */

import type {
  ContentBundle,
  MapDef,
  OperatorDef,
} from './schema';
import { PROFESSIONS, RARITIES } from './schema';

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
}

const isPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

function checkIds(
  kind: string,
  items: readonly { readonly id: string }[],
  issues: ValidationIssue[],
): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (typeof item.id !== 'string' || item.id.trim() === '') {
      issues.push({ path: `${kind}[${index}].id`, message: 'id 必须是非空字符串' });
      return;
    }
    if (seen.has(item.id)) {
      issues.push({ path: `${kind}[${index}].id`, message: `id 重复：${item.id}` });
      return;
    }
    seen.add(item.id);
  });
}

function validateOperators(
  operators: readonly OperatorDef[],
  content: ContentBundle,
  issues: ValidationIssue[],
): void {
  checkIds('operators', operators, issues);
  const skillIds = new Set(content.skills.map((s) => s.id));
  const synergyIds = new Set(content.synergies.map((s) => s.id));

  operators.forEach((operator, index) => {
    const path = `operators[${index}] (${operator.id})`;
    if (!RARITIES.includes(operator.rarity)) {
      issues.push({ path, message: `rarity 必须是 1–6，实际 ${String(operator.rarity)}` });
    }
    if (!PROFESSIONS.includes(operator.profession)) {
      issues.push({ path, message: `profession 未知：${String(operator.profession)}` });
    }
    // block 允许为 0（不阻挡），这里只拦负数/非数字
    if (!isNonNegativeNumber(operator.block)) {
      issues.push({ path, message: 'block 必须是 0 或正整数' });
    }
    for (const field of ['attackRange', 'deployCost', 'hp', 'atk', 'def'] as const) {
      if (!isNonNegativeNumber(operator[field])) {
        issues.push({ path, message: `${field} 必须是非负数字` });
      }
    }
    for (const skillId of operator.skillIds ?? []) {
      if (!skillIds.has(skillId)) {
        issues.push({ path, message: `引用了不存在的技能：${skillId}` });
      }
    }
    for (const synergyId of operator.synergyIds ?? []) {
      if (!synergyIds.has(synergyId)) {
        issues.push({ path, message: `引用了不存在的盟约：${synergyId}` });
      }
    }
  });
}

function validateItems(content: ContentBundle, issues: ValidationIssue[]): void {
  checkIds('items', content.items, issues);
  const itemIds = new Set(content.items.map((item) => item.id));
  content.items.forEach((item, index) => {
    for (const ingredient of item.recipe ?? []) {
      if (!itemIds.has(ingredient)) {
        issues.push({
          path: `items[${index}] (${item.id})`,
          message: `合成配方引用了不存在的装备：${ingredient}`,
        });
      }
    }
  });
}

function validateWaves(content: ContentBundle, issues: ValidationIssue[]): void {
  checkIds('waves', content.waves, issues);
  const enemyIds = new Set(content.enemies.map((enemy) => enemy.id));
  content.waves.forEach((wave, waveIndex) => {
    const path = `waves[${waveIndex}] (${wave.id})`;
    if (!Array.isArray(wave.rounds) || wave.rounds.length === 0) {
      issues.push({ path, message: 'rounds 不能为空' });
    }
    for (const round of wave.rounds) {
      if (!isPositiveInt(round.round)) {
        issues.push({ path, message: `round 必须是正整数，实际 ${String(round.round)}` });
      }
      for (const spawn of round.enemies) {
        if (!isPositiveInt(spawn.count)) {
          issues.push({ path, message: `敌人数量必须是正整数（${spawn.enemyId}）` });
        }
        if (!enemyIds.has(spawn.enemyId)) {
          issues.push({ path, message: `引用了不存在的敌人：${spawn.enemyId}` });
        }
      }
    }
  });
}

function validateMap(map: MapDef, issues: ValidationIssue[]): void {
  const path = `maps (${map.id})`;
  if (!isPositiveInt(map.cols) || !isPositiveInt(map.rows)) {
    issues.push({ path, message: 'cols/rows 必须是正整数' });
    return;
  }
  if (map.layout.length !== map.rows) {
    issues.push({
      path,
      message: `layout 有 ${map.layout.length} 行，与 rows=${map.rows} 不一致`,
    });
  }
  let deployable = 0;
  let spawns = 0;
  let goals = 0;

  map.layout.forEach((line, row) => {
    if (line.length !== map.cols) {
      issues.push({
        path,
        message: `第 ${row} 行长度 ${line.length}，与 cols=${map.cols} 不一致`,
      });
    }
    for (const char of line) {
      if (!(char in map.legend)) {
        issues.push({ path, message: `legend 缺少字符 "${char}"` });
        continue;
      }
      const flags = map.legend[char]?.flags ?? [];
      if (flags.includes('deployable')) deployable += 1;
      if (flags.includes('spawn')) spawns += 1;
      if (flags.includes('goal')) goals += 1;
    }
  });

  if (deployable === 0) issues.push({ path, message: '地图没有可部署格（deployable）' });
  if (spawns === 0) issues.push({ path, message: '地图没有敌人入口（spawn）' });
  if (goals === 0) issues.push({ path, message: '地图没有防守目标（goal）' });
}

function validateBalance(content: ContentBundle, issues: ValidationIssue[]): void {
  const { config } = content;
  const path = 'config/balance.json';

  if (config.schemaVersion !== 1) {
    issues.push({ path, message: `schemaVersion 应为 1，实际 ${String(config.schemaVersion)}` });
  }
  if (!isPositiveInt(config.round.total)) {
    issues.push({ path, message: 'round.total 必须是正整数' });
  }
  for (const field of ['startingGold', 'baseIncome', 'interestPerTen', 'maxInterestPerRound'] as const) {
    if (!isNonNegativeNumber(config.economy[field])) {
      issues.push({ path, message: `economy.${field} 必须是非负数字` });
    }
  }
  if (!isPositiveInt(config.leveling.maxLevel)) {
    issues.push({ path, message: 'leveling.maxLevel 必须是正整数' });
    return;
  }
  if (config.leveling.upgradeCosts.length !== config.leveling.maxLevel - 1) {
    issues.push({
      path,
      message: `leveling.upgradeCosts 长度应为 maxLevel-1=${config.leveling.maxLevel - 1}，实际 ${config.leveling.upgradeCosts.length}`,
    });
  }
  if (config.shop.oddsByLevel.length !== config.leveling.maxLevel) {
    issues.push({
      path,
      message: `shop.oddsByLevel 应有 ${config.leveling.maxLevel} 行（每个等级一行）`,
    });
  }
  config.shop.oddsByLevel.forEach((row, index) => {
    if (row.length !== 6) {
      issues.push({ path, message: `shop.oddsByLevel[${index}] 应有 6 个权重（1–6 星）` });
    }
    if (row.some((weight) => !isNonNegativeNumber(weight))) {
      issues.push({ path, message: `shop.oddsByLevel[${index}] 权重必须是非负数字` });
    }
  });
  if (!isPositiveInt(config.shop.slots)) issues.push({ path, message: 'shop.slots 必须是正整数' });
  if (!isPositiveInt(config.bench.slots)) issues.push({ path, message: 'bench.slots 必须是正整数' });
  if (config.board.slotsByLevel.length !== config.leveling.maxLevel) {
    issues.push({
      path,
      message: `board.slotsByLevel 应有 ${config.leveling.maxLevel} 项（每个等级一项）`,
    });
  }
  if (!isPositiveInt(config.run.startingHp)) {
    issues.push({ path, message: 'run.startingHp 必须是正整数' });
  }
}

export function validateContent(content: ContentBundle): ValidationResult {
  const issues: ValidationIssue[] = [];

  validateBalance(content, issues);
  validateOperators(content.operators, content, issues);
  checkIds('skills', content.skills, issues);
  checkIds('synergies', content.synergies, issues);
  content.synergies.forEach((synergy, index) => {
    if (synergy.thresholds.length === 0) {
      issues.push({ path: `synergies[${index}] (${synergy.id})`, message: 'thresholds 不能为空' });
    }
    const sorted = synergy.thresholds.every((value, i) => i === 0 || value > (synergy.thresholds[i - 1] ?? 0));
    if (!sorted) {
      issues.push({ path: `synergies[${index}] (${synergy.id})`, message: 'thresholds 必须严格升序' });
    }
  });
  validateItems(content, issues);
  checkIds('enemies', content.enemies, issues);
  validateWaves(content, issues);

  const mapIds = new Set<string>();
  content.maps.forEach((map) => {
    if (mapIds.has(map.id)) {
      issues.push({ path: `maps (${map.id})`, message: `id 重复：${map.id}` });
    }
    mapIds.add(map.id);
    validateMap(map, issues);
  });
  if (content.maps.length === 0) {
    issues.push({ path: 'maps', message: '至少需要一张地图（content/maps/*.json）' });
  }

  return { ok: issues.length === 0, issues };
}

export function assertValidContent(content: ContentBundle): void {
  const result = validateContent(content);
  if (result.ok) return;
  const lines = result.issues.map((issue) => `  - ${issue.path}: ${issue.message}`).join('\n');
  throw new Error(`内容数据校验失败（${result.issues.length} 个问题）：\n${lines}`);
}
