# 04 · 数据模型与 Schema

> 代码里的唯一事实来源是 `src/content/schema.ts`；本文解释字段**为什么这么设计**，并给最小示例。
> 字段改了但本文没改，以代码为准（请顺手提 PR 修文档）。

## 1. 设计原则

1. **数据与代码分离**：加干员/改平衡/画地图 = 改 JSON，不碰 `src/`；
2. **id 稳定**：跨文件引用永远用 id（不用数组下标），改名要新增 id 并迁移；
3. **加载即校验**：启动和测试时用同一套校验器，坏数据带具体路径报错；
4. **可空可占位**：允许内容为空（M0 就是这样），游戏要能启动并提示「内容待添加」；
5. **可序列化**：运行时状态（`RunState`）也是纯数据，为存档/回放/联机做准备；
6. **版本兜底**：`schemaVersion` 作为数据格式版本；将来不兼容变更时写迁移。

## 2. 实体关系

```
                 ┌─────────────────────┐
                 │ BalanceConfig       │  全局规则参数（config/balance.json）
                 └─────────────────────┘

 OperatorDef ──skills──▶ SkillDef
      │
      └──synergies──▶ SynergyDef

 ItemDef ──recipe──▶ ItemDef（合成配方）

 WaveDef ──rounds[].enemies[].enemyId──▶ EnemyDef

 MapDef ──parse──▶ GridMap（运行时结构）

 RunState（运行时状态，由 sim 生成，不来自 content/）
   ├─ shop: 干员 id 列表
   ├─ bench: 实例 uid 列表
   ├─ units: uid → OperatorInstance
   └─ board: uid + 坐标 + 朝向
```

## 3. 全局规则：`BalanceConfig`

文件：`content/config/balance.json`（单文件，整体替换）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `schemaVersion` | number | 数据格式版本，当前 `1` |
| `round.total` | number | 一局总回合数 |
| `round.prepSeconds` | number | 休整期秒数（只影响 UI 计时） |
| `economy.startingGold` | number | 开局金币 |
| `economy.baseIncome` | number | 每回合基础收入 |
| `economy.interestPerTen` | number | 每 10 金币的利息 |
| `economy.maxInterestPerRound` | number | 单回合利息上限 |
| `economy.winBonus` / `lossBonus` | number | 连胜/连败补贴 |
| `economy.sellRefundRatio` | number | 出售返还比例（1 = 原价） |
| `leveling.maxLevel` | number | 调度中心最高等级 |
| `leveling.upgradeCosts` | number[] | 升到下一级的费用，长度必须是 `maxLevel - 1` |
| `shop.slots` | number | 商店格子数 |
| `shop.refreshCost` | number | 刷新费用 |
| `shop.oddsByLevel` | number[][] | 每个等级一行、每行 6 个稀有度权重（1–6 星） |
| `bench.slots` | number | 整备区格子数 |
| `board.slotsByLevel` | number[] | 每个等级的上阵位数量，长度 `maxLevel` |
| `run.startingHp` | number | 目标生命初始值 |

> 这些值目前是**占位默认值**，不是最终平衡数据。

## 4. 内容实体

### 4.1 干员 `OperatorDef`（`content/operators/<id>.json`）

```json
{
  "id": "example_guard",
  "name": "占位近卫",
  "rarity": 3,
  "profession": "guard",
  "factions": ["example_faction"],
  "tags": ["melee"],
  "block": 2,
  "attackRange": 1,
  "deployCost": 3,
  "hp": 1200,
  "atk": 260,
  "def": 180,
  "attackIntervalTicks": 36,
  "skillIds": [],
  "synergyIds": []
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 稳定唯一 id |
| `name` | ✅ | 显示名（中文按项目需要） |
| `rarity` | ✅ | 1–6，决定商店权重与出售价 |
| `profession` | ✅ | `vanguard/guard/defender/sniper/caster/medic/supporter/specialist` |
| `factions` | | 阵营/势力，用于盟约 |
| `tags` | | 自由标签（远程、元素、召唤……） |
| `block` | ✅ | 阻挡数，0 = 不阻挡 |
| `attackRange` | ✅ | 攻击范围（格）；形状规则在战斗解算里 |
| `deployCost` | ✅ | 商店招募价格 |
| `hp/atk/def` | ✅ | 三围（占位数值即可） |
| `attackIntervalTicks` | | 攻击间隔；缺省由战斗解算给默认值 |
| `skillIds` | | 引用 `content/skills/` |
| `synergyIds` | | 引用 `content/synergies/` |

### 4.2 技能 `SkillDef`（`content/skills/<id>.json`）

```json
{
  "id": "example_skill",
  "name": "占位技能",
  "description": "对前方敌人造成伤害。",
  "cooldownTicks": 300
}
```

允许额外扩展字段（`[extension: string]: unknown`）放伤害倍率、目标类型等；等技能系统定了再把常用字段提升为强类型。

### 4.3 盟约 `SynergyDef`（`content/synergies/<id>.json`）

```json
{
  "id": "example_synergy",
  "name": "占位盟约",
  "description": "在场 3/5 名同阵营干员时激活。",
  "thresholds": [3, 5]
}
```

`thresholds` 必须严格升序；层数效果 M2 实现。

### 4.4 装备 `ItemDef`（`content/items/<id>.json`）

```json
{
  "id": "example_item",
  "name": "占位装备",
  "description": "攻击力 +10%。",
  "recipe": []
}
```

`recipe` 引用其他装备 id（合成配方）；空数组表示基础装备。

### 4.5 敌人 `EnemyDef`（`content/enemies/<id>.json`）

```json
{
  "id": "example_enemy",
  "name": "占位敌人",
  "hp": 500,
  "atk": 100,
  "def": 0,
  "speed": 0.8,
  "flying": false
}
```

`speed` 单位是格/秒（战斗内部换算成每 tick 位移）。

### 4.6 波次 `WaveDef`（`content/waves/<id>.json`）

```json
{
  "id": "example_wave",
  "name": "占位波次",
  "rounds": [
    {
      "round": 1,
      "enemies": [
        { "enemyId": "example_enemy", "count": 6, "intervalTicks": 45, "spawnIndex": 0 }
      ]
    }
  ]
}
```

`round` 对应一局里的回合；`spawnIndex` 选地图上第几个入口（按行优先顺序），缺省轮换。

### 4.7 地图 `MapDef`（`content/maps/<id>.json`）

```json
{
  "id": "demo-board",
  "name": "占位战场 · 12×7",
  "cols": 12,
  "rows": 7,
  "legend": {
    "#": { "kind": "wall" },
    ".": { "kind": "ground" },
    "d": { "kind": "ground", "flags": ["deployable"] },
    "S": { "kind": "ground", "flags": ["spawn"] },
    "G": { "kind": "ground", "flags": ["goal"] }
  },
  "layout": [
    "#S........S#",
    "#..........#",
    "#..#....#..#",
    "#dddddddddd#",
    "#dddddddddd#",
    "#dddddddddd#",
    "#....G.....#"
  ]
}
```

| 字段 | 说明 |
|---|---|
| `cols` / `rows` | 尺寸；`layout` 行数必须等于 `rows`，每行长度等于 `cols` |
| `legend` | 字符 → `{ kind, flags }`；`kind` ∈ `void/ground/highGround/wall`，`flags` ∈ `deployable/spawn/goal` |
| `layout` | 字符画，行优先；每行等宽 |

加载后转成 `GridMap`（`src/content/map.ts`），渲染与 sim 只认 `GridMap`。

## 5. 运行时状态 `RunState`（不是内容）

定义在 `src/sim/state.ts`，由 `createRunState()` 生成，字段包括：

| 字段 | 说明 |
|---|---|
| `seed` / `rngState` | 种子与当前随机状态（可序列化，回放用） |
| `round` / `phase` | 当前回合与阶段（prep/combat/settle/finished） |
| `gold` / `level` / `hp` / `maxHp` | 经济与生命 |
| `streakWins` / `streakLosses` | 连胜/连败 |
| `shop` | 商店格子（干员 id 或 null） |
| `shopLocked` | 是否冻结 |
| `bench` | 整备区格子（实例 uid 或 null） |
| `units` | uid → `{ operatorId, star }` |
| `board` | `{ uid, at: {col,row}, facing }` |
| `nextUid` | 下一个实例编号（保证 uid 可预测） |
| `lastBattle` | 上一次战斗报告 |

## 6. 加载与校验流程

```
content/**/*.json
   │  import.meta.glob（构建时收集）
   ▼
loader.ts → ContentBundle
   │  validate.ts（启动时 assert，测试时断言）
   ▼
main.ts → GameSession → sim
```

校验规则清单（`src/content/validate.ts`）：

- id：非空、同一实体集合内唯一；
- 干员：稀有度 1–6、职业合法、数值非负；
- 引用：`skillIds` / `synergyIds` / `item.recipe` / `wave.enemyId` 必须存在；
- 盟约：`thresholds` 非空且严格升序；
- 波次：回合数为正整数、数量为正整数；
- 地图：`layout` 行宽/行数匹配、字符在 legend 中、至少 1 个 deployable / spawn / goal；
- 平衡：升级费用长度、商店概率行数、上阵位长度与 `maxLevel` 一致。

新增规则时：改 `validate.ts` + 在 `tests/content/validate.test.ts` 加一个能报错的用例。

## 7. 版本与迁移

- `schemaVersion` 当前为 `1`；不兼容变更时升到 `2`，并在 `loader.ts` 里做迁移（或拒绝旧数据并提示）；
- id 永远不要复用；删除内容时直接在数据里移除，不要用「占位同名」顶替；
- 内容与代码版本一起发布时，建议在构建产物里写入内容 hash（后续工作，见 [02](02-技术架构.md) §7）。

## 8. 测试夹具

`tests/fixtures/content.ts` 是一套最小合法内容（2 个干员、5×4 地图、3 级平衡），
只服务测试，不是游戏内容。新增必填字段时记得同步夹具。
