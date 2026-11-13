/**
 * 内容加载器：把 content/ 下的 JSON 组装成 `ContentBundle`，并在启动时校验。
 *
 * 用 Vite 的 `import.meta.glob` 在构建时收集 JSON，这样：
 * - 新增一个 content/operators/xxx.json 不需要改任何代码；
 * - 生产构建只打包实际用到的数据；
 * - 校验和类型都在编译/启动阶段完成，不会把坏数据带进运行期。
 */

import balanceRaw from '../../content/config/balance.json';
import { assertValidContent } from './validate';
import type {
  BalanceConfig,
  ContentBundle,
  EnemyDef,
  ItemDef,
  MapDef,
  OperatorDef,
  SkillDef,
  SynergyDef,
  WaveDef,
} from './schema';

interface JsonModule<T> {
  readonly default: T;
}

function collect<T>(modules: Record<string, JsonModule<T>>): T[] {
  return Object.keys(modules)
    .sort()
    .map((key) => modules[key]!.default);
}

const operatorModules = import.meta.glob<JsonModule<OperatorDef>>('../../content/operators/*.json', {
  eager: true,
});
const skillModules = import.meta.glob<JsonModule<SkillDef>>('../../content/skills/*.json', {
  eager: true,
});
const synergyModules = import.meta.glob<JsonModule<SynergyDef>>('../../content/synergies/*.json', {
  eager: true,
});
const itemModules = import.meta.glob<JsonModule<ItemDef>>('../../content/items/*.json', {
  eager: true,
});
const enemyModules = import.meta.glob<JsonModule<EnemyDef>>('../../content/enemies/*.json', {
  eager: true,
});
const waveModules = import.meta.glob<JsonModule<WaveDef>>('../../content/waves/*.json', {
  eager: true,
});
const mapModules = import.meta.glob<JsonModule<MapDef>>('../../content/maps/*.json', {
  eager: true,
});

export function loadContent(): ContentBundle {
  const content: ContentBundle = {
    config: balanceRaw as BalanceConfig,
    operators: collect(operatorModules),
    skills: collect(skillModules),
    synergies: collect(synergyModules),
    items: collect(itemModules),
    enemies: collect(enemyModules),
    waves: collect(waveModules),
    maps: collect(mapModules),
  };
  assertValidContent(content);
  return content;
}
