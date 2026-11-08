# Super-agent 实验说明（本仓库的实验 B）

> 这是把一个**已验证跑通**的原型搬进仓库文档，方便下次会话照着开关。
> 完整参数与踩坑在本地知识库：`管理员/02-实践/2026-11-05-Super-agent原型-落地与开关-用法卡.md`（含敏感路径，故不复制进仓库）。

## 一、它是什么

官方 `dsh-superagent` 原型的落地：**GitHub 事件 → Trigger → 评估 → Ticket → Worker 干活 → 开 PR / 回评论**。
编排由 bundle 代码完成，Router / Worker 只是两份 agent preset（会话组成），不是另外的编排层。

## 二、跑在哪

| 项 | 值 |
|---|---|
| 环境 | WSL Ubuntu 22.04（**Windows 原生跑不动**：脚本与 tmux 是 Unix 依赖） |
| 代码 | `/root/dsh-superagent` |
| 独立 profile | `~/.dsh/profiles/superagent`（不影响桌面端 DSH） |
| 状态库 | `/root/.dsh/state/superagent/orchestrator.sqlite`（trigger/ticket/decision/outbox/thread） |
| 面板 | `127.0.0.1:3082/orchestrator/api`，请求头 `x-orchestrator-request: 1` |
| 开关 | 本地 `01-加工区/superagent-run/` 下的 `01-START / 02-STOP / 03-STATUS / 04-PANEL` 四个 bat |

## 三、怎么派活（实验的用法）

1. 用**主账号**（`shi1xiao2jia3-star`）在本仓库开 issue 或评论，**正文里 @ 小号**（`leechary337688-sudo`）；
2. Source 轮询到 → Trigger（thread `github:<num>`）→ 评估 `accept`（reason=`explicitRouted`）→ 建 Ticket；
3. Worker 在独立目录干活 → 推分支 → 开 PR → 回两条评论（ack + 交付说明）；
4. 停在 `person/review`，**等人合并**。

评估模式默认 `observe`：只有白名单上的人 explicit @ 才接单；`inferred`（没人 @）只记录"本会接单"。

## 四、已知坑（重踩会很浪费时间）

| # | 坑 | 处理 |
|---|---|---|
| 1 | **标题里的 @ 不发通知**，Source 收不到 | 必须写在 issue/评论**正文** |
| 2 | Node 24 的进程名是 `MainThread`，原型脚本只认 `node`/`dsh` | 给 `scripts/dsh-superagent` 的白名单打补丁；`git pull` 升级后会覆盖，**需重打** |
| 3 | profile 初始化命令只能跑一次，重跑会删 `cordis.patch.yml` | 升级时只改 patch，不要重跑初始化 |
| 4 | 面板 URL 的 token 每次启动都变 | 用 `04-PANEL.bat` 从最新日志取，别手抄 |
| 5 | 首次 `start` 超时留下的进程不受脚本管理 | `02-STOP.bat` 里有 `tmux kill-session` 兜底 |
| 6 | 空仓库没有默认分支 / 私有仓库主号评论不了 | 先有 README；仓库转 public 或加协作者 |

## 五、安全边界

- 原型两个角色都是 `danger-full-access`，且在 WSL 里以 root 跑 → **不要长期无人看管常开**；
- 智能体的写操作止于分支与 PR，**合并权在人**；
- 小号凭据在 WSL 的 gh 配置目录里，需要撤销时 `gh auth logout` 或在 GitHub 设置里 revoke。

## 六、验证命令

```powershell
# 状态（有 pids + health.runtime=ready 才算开着）
wsl -d Ubuntu-22.04 -- bash -lc "cd /root/dsh-superagent && scripts/dsh-superagent status"

# 面板状态（本机）
wsl -d Ubuntu-22.04 -- bash -lc "curl -s -H 'x-orchestrator-request: 1' http://127.0.0.1:3082/orchestrator/api/state | head -c 400"
```
