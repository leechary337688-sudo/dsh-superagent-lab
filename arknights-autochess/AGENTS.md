# AGENTS.md · 给后续 AI / 协作者的约定

这是 `arknights-autochess/` 的工程约定。动手前先读 [`docs/00-总览与范围.md`](docs/00-总览与范围.md)
和 [`docs/03-目录结构与模块边界.md`](docs/03-目录结构与模块边界.md)。

## 当前状态

**M0 框架阶段**：目录/架构/数据格式/可运行空壳已完成；**没有游戏内容**（干员/技能/波次/正式地图/美术）。
不要假设内容存在，也不要为了「看起来完整」塞假角色——内容等设计确定后由项目所有者拍板。

## 必跑命令

```bash
npm install          # 首次
npm run check        # 架构守卫 + 类型检查 + 单测 + 构建（提交前必须绿）
npm run dev          # http://localhost:5173
```

## 硬规则

1. **模块边界**（`tools/check-layers.mjs` 强制）：
   - `core/` 零依赖；`content/` 只依赖 `core/` 类型；`sim/` 不碰 DOM/Pixi/Preact；
   - `render/`、`ui/`、`app/` 只依赖下层；状态只能通过 `app/session.ts` 的意图方法修改。
2. **确定性**：`sim/` 里禁止 `Math.random`、`Date.now`、`new Date`、`performance.now`、
   `Math.sin/cos/pow/hypot` 等；随机用 `core/rng.ts`，时间用 tick。
3. **数据驱动**：内容/规则参数写 `content/*.json`，不写死在代码里；新字段先改
   `src/content/schema.ts` + `validate.ts` + 测试夹具，再更新 `docs/04`。
4. **版权**：不提交官方素材/数据。个人研究用素材放 `content-local/`、`public/assets-local/`
   （已 gitignore）。详见 [`NOTICE.md`](NOTICE.md) 与 [`docs/05`](docs/05-美术音频与开源素材.md)。
5. **测试**：每个 sim 规则改动配单测；新增内容校验规则配「能报错」的用例；不删已有测试来让检查变绿。
6. **文档同步**：目录/依赖/数据格式/里程碑有变化就改对应 `docs/`；PR 描述写「用户可见变化 + 验证方式」。

## 代码风格

- TypeScript `strict` + `noUncheckedIndexedAccess`；数组下标先处理 `undefined`；
- 代码标识符英文，面向玩家的文字中文（集中放 `ui/labels.ts` 或组件内）；
- 纯类型用 `import type`；不引入 ESLint/Prettier（要加请单独 PR）；
- 不新增依赖除非有明确必要，并在 `docs/07` 记录许可与用途。

## 加内容的最小流程

1. 在 `content/` 对应目录建 JSON（字段见 `docs/04`）；
2. `npm test` —— 校验器会检查 id/引用/地图行宽；
3. `npm run dev` 手工确认（商店抽到、地图能渲染等）；
4. 若新增了实体类型，补 schema/validate/loader/测试/文档。

## 目录速记

| 要改什么 | 去哪 |
|---|---|
| 规则数值 | `content/config/balance.json` |
| 干员/技能/盟约/装备/敌人/波次 | `content/<对应目录>/*.json` |
| 地图 | `content/maps/*.json`（ASCII + legend） |
| 经济/商店/合成/摆放/回合逻辑 | `src/sim/` |
| 战斗解算（M1） | `src/sim/battle.ts`（计划拆 `sim/battle/`） |
| 棋盘画面 | `src/render/` |
| HUD/面板 | `src/ui/` |
| 装配/订阅 | `src/app/session.ts` |
| 架构/确定性守卫 | `tools/check-layers.mjs` |

## 提交与 PR

- 分支名带 ticket/功能名；提交信息用「做了什么 + 为什么」；
- PR 描述包含：变更范围、验证命令与结果、截图（UI 变化）、未完成/风险；
- 不 force-push 共享分支；不改无关文件；不删除既有文档/测试。
