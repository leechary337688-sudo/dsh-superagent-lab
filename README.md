# dsh-superagent-lab

**实验用仓库**：把「手机 ↔ 电脑 DSH 互通」和「DeepSeek Super-agent」放在同一个实验室里验证。
由 AI 智能体（GitHub 小号 `leechary337688-sudo`）提交，人类主号（`shi1xiao2jia3-star`）派活与验收。

> ⚠️ 这不是官方项目。里面的做法只保证"在本机跑通过"，不承诺通用性。

---

## 这个仓库在验证什么

| 实验 | 要回答的问题 | 现状 |
|---|---|---|
| **A. 远程操作**（`docs/00-项目卡.md`） | 手机能不能像第二块屏幕一样操作电脑上的同一个会话？ | 阶段 0 已完成（调研+方案），待验证 4 条假设 |
| **B. Super-agent** | 让智能体自己接 issue 干活、开 PR、回评论，人只做合并 | 原型已在 WSL 跑通（见 `docs/03-superagent-实验说明.md`） |
| **C. 自走棋游戏**（`arknights-autochess/`） | 用一个真实游戏项目验证「先框架后内容」的工程组织方式 | 框架阶段（M0）：目录/架构/数据格式/可运行空壳，游戏内容待做 |

三个实验共用一条底线：**人类保留最终决定权**（合并、授权、花钱）。

## 目录

```
docs/
  00-项目卡.md              远程操作：目标 / 验证标准 / 路线 / 风险 / 止损
  01-调研-别人怎么做.md       happy / cc-remote / AgentFlow / VibeTunnel / KDE Connect 对照
  02-仓库蓝图.md             仓库结构、v0.1 范围、发布流程
  03-superagent-实验说明.md   Super-agent 原型怎么开关、怎么派活、踩过的坑
  04-手机App方案.md          第一版（已被 05/06 取代，保留决策过程）
  05-手机App架构方案v2.md    官方写模型查证：单引擎多客户端 / 双引擎只能串行接力
  06-三种形态与最终选择.md    四种形态对照、DSHA 明确拒绝反向、cc-remote 八条可抄、选择与里程碑
arknights-autochess/   自走棋 + 塔防游戏骨架（单独的子项目，见其 README）
src/        插件源码（阶段 1 之后再放）
tools/      一次性验证脚本
out/        构建产物（不进 Git）
```

## C. 自走棋游戏（框架阶段）

`arknights-autochess/` 是一个**非官方同人学习项目**：自走棋运营（商店/三合一/盟约/升本）+ 方舟式塔防战斗
（底部部署格/朝向/阻挡/漏怪扣目标生命），参考《明日方舟》「卫戍协议」、「云顶之弈」和「货币战争」。
与鹰角网络、Riot、miHoYo 均无关联，仓库不含官方素材（见 `arknights-autochess/NOTICE.md`）。

当前是 **M0 框架阶段**：架构、目录、数据格式和可运行空壳已就绪，干员/技能/波次/正式战场/美术等内容待设计确定后再做。

```bash
cd arknights-autochess
npm install
npm run dev     # http://localhost:5173
npm run check   # 架构守卫 + 类型检查 + 单测 + 构建
```

设计与调研见 [`arknights-autochess/docs/`](arknights-autochess/docs/00-总览与范围.md)，先读 00-总览。

## 安全声明

- 不做公网中继；跨网访问只走 Tailscale 私有网络。
- 不提交任何令牌、cookie、配对码；凭据只存在本机（详见本地知识库的"身份与资产索引"，不在仓库里）。
- 智能体的写权限止于**分支与 PR**；合并权、发布权、付费权永远在人手里。

## 许可

MIT（见 `LICENSE`）。参考的第三方项目：`slopus/happy`、`muggle-stack/cc-remote`、`amantus-ai/vibetunnel`（MIT）、`KDE/kdeconnect-android`（GPL-2.0，**只借鉴思路，不含其代码**）。
