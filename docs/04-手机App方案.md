# 手机 App 版方案（读 DSHA 源码后的修正版）

2026-11-08 · 取代 `00-项目卡.md` 里的 R1–R4 细化（路线不变，落点更具体）
依据：[DSH-APP/DSHA](https://github.com/DSH-APP/DSHA)（MIT，3171★，Java/Android，2026-11-08 仍在更新）+ 本仓库 `01-调研-别人怎么做.md`

---

## 一、先看清 DSHA 是什么（不是"套壳浏览器"）

DSHA = **在手机上跑完整 deepseek-harness 的启动器**：proot Ubuntu + 内置 DSH 引擎 + 原生 Android 能力桥。
它的架构恰好就是我们 PC 侧要做的"镜像"，而且**是 MIT，可以抄代码**。

| 组件 | 端口/位置 | 作用 | 对我们的价值 |
|---|---|---|---|
| DSH Web 后端 | `127.0.0.1:<动态端口>` | 手机自己的 DSH 引擎 + 移动 UI | 证明"官方 Web UI 可以跑在移动端" |
| **LAN 网页代理** `LanProxyService` | `0.0.0.0:3081`（默认关） | 把手机 DSH 网页**带令牌**暴露到局域网 | **PC 侧要造的就是它的镜像** |
| **Android 能力桥** `HttpShellService` | `127.0.0.1:3090`，`X-Token` | 33 条路由：设备/应用、文件 readfile/export/share、剪贴板、位置、传感器、通知、`/app/open`、overlay、plugins、虚拟屏 | 手机"文件/状态"给 AI 用的正路 |
| Web 原生文件口 | `window.DSHA.shareFile / saveFile` | 同源顶层页注入（WebMessageListener） | 手机本地文件与网页双向 |
| `DshaDocumentsProvider` | 系统文件管理器 | 让 MT 管理器等访问私有目录 | 手动取文件 |
| `WebPreviewActivity` | App 内 | WebView / Gecko 内嵌预览 | 手机端"打开电脑界面"的落点 |

## 二、抄 LanProxyService 的哪几招（这是方案的核心）

DSHA 的 LAN 代理设计得非常克制，逐条可移植到我们的 Node 插件：

1. **每轮一个 32 字节随机 token**，链接里 `?token=`；首次有效访问返回 **303**，种 `HttpOnly; SameSite=Strict; Max-Age=43200`（12h）cookie，并**从 URL 里剥掉 token**（保留路径与其它查询参数，OAuth 回调不会被改坏）；
2. **cookie 12h ≠ 服务端 token 12h**：停止/撤销后旧 cookie 立即失效；
3. **只代理"本轮已鉴权"的后端端口**，后端凭据不暴露给浏览器；
4. 处理 **WebSocket 升级、分块传输、连接额度**（这正是远程 UI 的必需项）；
5. 默认关闭、可随时撤销，撤销即断开已有连接；
6. 它自己的坦白：**明文 HTTP 无 TLS，只适合可信网络** —— 我们用 Tailscale serve 补上这一块（HTTPS 由 tailscaled 提供，链路加密）。

## 三、方案 A（推荐）：手机当"第二块屏幕"

```
手机（DSHA / 浏览器）
  └─ 打开 https://silence.tail9914d1.ts.net/remote?token=<一次性>   ← Tailscale 加密
        └─ PC 侧 dsh-remote 插件（LanProxy 的镜像）
             ├─ 303 + HttpOnly cookie（剥 token）
             ├─ 反向代理 → 127.0.0.1:62861（官方 Web GUI）
             └─ WebSocket 透传 → 手机看到的就是"电脑上那个会话"
```

**为什么这是最省的**：手机打开的是**电脑的真实 UI**，于是

- 同一会话、工具卡片、折叠、Markdown —— **全部原生**；
- **审批弹窗、提问卡片原生就在页面上**（不需要做"转发"！原先 B1/B2 的工作量直接消失）；
- 断线重连、历史加载由官方客户端负责；
- 我们只维护一个反向代理 + 令牌，不碰任何会话逻辑。

**入口三选一**（从省事到体验）：

| 入口 | 做法 | 成本 |
|---|---|---|
| 手机浏览器 | 打开链接（可存书签） | 0 |
| DSHA 内 `WebPreviewActivity` | 插件按钮 → 调桥 `/app/open`，或 `window.open` | 小 |
| 手机浏览器 + 加到桌面（PWA 式） | 独立图标 | 0 |

## 四、方案 B（文件与状态）：把手机能力接给 AI

| 方向 | 做法 | 依据 |
|---|---|---|
| 手机 → 电脑 | ① 现有 `/api/upload`（走我们的桥）；② 手机宿主半读 `/root/.dsh/.bridge_headers` 的 token → 调 `3090/app/readfile`（文本 ≤256KiB）→ 转发给 PC | 桥文档 |
| 电脑 → 手机 | ① PC 出件箱 `GET /out/<file>`（网页原生下载，落手机 Download）；② 手机端 `window.DSHA.saveFile`（仅手机自己的 Web UI 有效，远程 UI 里没有） | 桥文档 + Web 文件口 |
| 剪贴板 | `/app/clip`（读/写） | 桥文档 |
| 设备状态（presence） | `/app/device`、`/app/sensors`、`/app/location`（默认关闭、需授权）→ 上报 PC → `system-prompt` 注入"你在哪、什么网络、电量" | 桥文档 + 宿主 `systemPrompt` 服务 |
| 审批/提问 | **方案 A 下不需要转发**（原生弹窗）；只有走自制 UI 才需要 `approval/request` + `user-questions/request` 的 waterfall 接管 | 宿主事件契约 |

## 五、方案 C（长期，做成资产）：给 DSHA 反向补一个"远程主机"

DSHA 现在只解决了"别人访问我的手机"，没有"我访问我的电脑"。两条资产化路线：

1. **我们自己的插件 `dsh-remote`**（PC 侧）：LanProxy 镜像 + 出件箱 + presence 采集端 → 独立仓库，任何 DSH 宿主都能装；
2. **给 DSHA 提 PR/插件**：在它的配置页加"远程主机"（连 PC），复用它的 LAN 认证与 WebView；这条路能让"手机 App 原生支持"一步到位，但受上游节奏约束。

建议：先做 1（可控），跑通后再评估 2。

## 六、阶段与验收

| 阶段 | 做什么 | 验收证据 |
|---|---|---|
| **S1（0.5–1 天）** | PC 侧反向代理 + 一次性 token + cookie + WS 透传；`tailscale serve` 指向它 | 手机 4G 打开 → 看到电脑同一会话 → 发一句 → 电脑出现 → 回复流式回手机（截图×2 + 日志） |
| **S2（1 天）** | 手机入口打磨：插件按钮调 `/app/open`；链接失效时给"重新取链接" | 手机上点两下进入 |
| **S3（1 天）** | PC 出件箱：`/out/` 列表 + 下载 + 过期清理 | AI 产出的文件在手机上点开/下载 |
| **S4（1–2 天）** | presence：设备/网络/电量（可选位置）上报 → 注入提示 | 问 AI"我在哪"能答对 |
| **S5（可选）** | 手机 → PC 文件（桥 readfile 转发）；剪贴板 | 把手机里的文件丢给 AI |

## 七、风险与止损

| 风险 | 对策 |
|---|---|
| 桌面 UI 在手机上难用（按钮小、键盘遮挡） | S1 先验；不行再考虑"把 DSHA 的移动 UI 也用到 PC 宿主"或退回自制轻客户端 |
| 把整个 DSH 控制权开到网上 | 只走 Tailscale（不公网）；token 一次性 + cookie 短命 + 可撤销；请求记审计日志 |
| 代理把 WebSocket 弄坏 → 界面"假死" | WS 升级单独测；失败可见（日志 + 页面提示），不静默 |
| DSHA 桥 token 位置随版本变 | 只依赖文档化的 `/root/.dsh/.bridge_headers` 与 `/app/version` 能力探测，不猜端点 |

## 八、许可

DSHA 是 MIT → **可抄代码**（保留版权与许可声明）。KDE Connect（GPL-2.0）只借鉴"presence 拆能力位小包"的思路，不含其代码。
