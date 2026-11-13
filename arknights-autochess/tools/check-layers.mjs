#!/usr/bin/env node
/**
 * 架构守卫（不依赖任何 npm 包，CI 和本地都能跑）：
 *
 * 1. 模块边界：core 不依赖任何东西；content 只依赖 core 的类型；sim 只依赖 core/content，
 *    不许碰 DOM / 渲染 / UI；表现层（render/ui/app）只能通过 sim 的公开接口读状态。
 * 2. 确定性：sim/ 里禁止 Math.random、Date.now、new Date、performance.now；
 *    禁止平台实现可能不一致的 Math.sin/cos/pow/hypot 等（用 core/math.ts 或简化算法）。
 *
 * 用法：node tools/check-layers.mjs
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const CONTENT = path.join(ROOT, 'content');

/**
 * 每个模块目录允许的依赖。
 * external：允许的第三方包；local：允许依赖的 src 子目录。
 */
const MODULES = {
  core: { external: [], local: ['core'] },
  content: { external: [], local: ['content', 'core'] },
  sim: { external: [], local: ['sim', 'core', 'content'] },
  render: { external: ['pixi.js'], local: ['render', 'core', 'sim', 'content', 'ui', 'app'] },
  ui: { external: ['preact', 'preact/hooks'], local: ['ui', 'core', 'sim', 'content', 'app'] },
  app: { external: [], local: ['app', 'core', 'sim', 'content'] },
  // src 根目录下的入口文件（main.ts）可以组装任意模块。
  '': { external: ['preact', 'preact/hooks'], local: ['', 'core', 'content', 'sim', 'render', 'ui', 'app'] },
};

const IMPORT_FROM = /\bfrom\s*['"]([^'"]+)['"]/g;
const IMPORT_DYNAMIC = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const IMPORT_SIDE_EFFECT = /\bimport\s*['"]([^'"]+)['"]/g;

const FORBIDDEN_IN_SIM = [
  { pattern: /\bMath\.random\s*\(/, hint: '用 createRng() 的种子随机，不要用 Math.random' },
  { pattern: /\bDate\.now\s*\(/, hint: 'sim 里不要读墙钟；用 tick 数表示时间' },
  { pattern: /\bnew\s+Date\s*\(/, hint: 'sim 里不要读墙钟；用 tick 数表示时间' },
  { pattern: /\bperformance\.now\s*\(/, hint: 'sim 里不要读墙钟；用 tick 数表示时间' },
  {
    pattern: /\bMath\.(sin|cos|tan|asin|acos|atan|atan2|pow|hypot|exp|log|log2|log10|random)\b/,
    hint: '这些函数在不同 JS 引擎上可能有末位差异；改用 core/math.ts 或只用四则运算',
  },
  {
    pattern: /\b(document|window|localStorage|navigator|requestAnimationFrame)\s*\./,
    hint: 'sim 必须能在 Node 里跑，不能访问浏览器 API',
  },
];

function extractSpecifiers(source) {
  const found = new Set();
  for (const regex of [IMPORT_FROM, IMPORT_DYNAMIC, IMPORT_SIDE_EFFECT]) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source)) !== null) {
      if (match[1] !== undefined) found.add(match[1]);
    }
  }
  return found;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function moduleOf(relativePath) {
  const segments = relativePath.split(path.sep);
  if (segments.length === 1) return '';
  return segments[0];
}

const violations = [];
const report = (file, message) => {
  violations.push(`${path.relative(ROOT, file)}: ${message}`);
};

const files = await walk(SRC);
const moduleCounts = new Map();

for (const file of files) {
  const relative = path.relative(SRC, file);
  const moduleName = moduleOf(relative);
  const rules = MODULES[moduleName];
  if (rules === undefined) {
    report(file, `未登记的模块目录 "${moduleName}"，请在 tools/check-layers.mjs 的 MODULES 里登记`);
    continue;
  }
  moduleCounts.set(moduleName, (moduleCounts.get(moduleName) ?? 0) + 1);

  const source = await readFile(file, 'utf8');
  for (const specifier of extractSpecifiers(source)) {
    if (specifier.startsWith('.')) {
      const resolved = path.resolve(path.dirname(file), specifier);
      const relativeToSrc = path.relative(SRC, resolved);
      const outsideSrc = relativeToSrc.startsWith('..');
      if (outsideSrc) {
        const insideContent = !path.relative(CONTENT, resolved).startsWith('..');
        if (moduleName === 'content' && insideContent) continue;
        report(file, `越界导入 "${specifier}"（只允许 content/ 模块读 content/ 下的 JSON）`);
        continue;
      }
      const targetModule = relativeToSrc.split(path.sep)[0];
      if (!rules.local.includes(targetModule)) {
        report(file, `不允许从 ${moduleName || 'src 根'} 依赖 "${targetModule}"（导入 "${specifier}"）`);
      }
      continue;
    }

    if (!rules.external.includes(specifier)) {
      if (specifier.startsWith('node:')) {
        report(file, `src 里不能 import Node 内置模块 "${specifier}"`);
      } else {
        report(file, `模块 ${moduleName || 'src 根'} 不允许依赖第三方包 "${specifier}"`);
      }
    }
  }

  if (moduleName === 'sim') {
    for (const rule of FORBIDDEN_IN_SIM) {
      if (rule.pattern.test(source)) {
        report(file, rule.hint);
      }
    }
  }
}

const summary = [...moduleCounts.entries()]
  .filter(([name]) => name !== '')
  .map(([name, count]) => `${name} ${count}`)
  .join(' / ');

if (violations.length > 0) {
  console.error(`架构检查失败（${violations.length} 个问题）：`);
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

console.log(`架构检查通过：${files.length} 个文件（${summary}）`);
