# 手机 App 架构方案 v2（官方写模型查证后）

2026-11-08 · 取代 `04-手机App方案.md` 的架构部分（那份的“反向代理开官方界面”只是过渡，不是终局）
依据：DSH 官方包 README（`api-remotes / api-gateway / api-remote-access / client-connection / session-persistence-jsonl / session-query / headless / acp / web-app`）+ B站与 GitHub 三个同类项目

---

## 一、先钉死一个事实：两个引擎**不能**同时写同一个会话

| 事实 | 出处（官方 README） |
|---|---|
| 会话是事件溯源、**只追加**，seq 由追加路径分配 | `dsh-session`「在内存中创建并持有事件溯源的 Session 实例」 |
| 每会话**同一时刻只有一个活动写者**，用内核锁排他（非阻塞 flock；Windows 是命名内核信号量） | `dsh-session-persistence-jsonl`「已知限制：每会话一个活动写入方……排除其他所有实例与进程」 |
| 写句柄被占时，别的进程 `create/resume` 直接失败（`session/writer-held`） | `dsh-api-session-controller` |
| 全仓**没有** CRDT / 多写者合并 / 冲突协调 | 包列表无任何 sync/collab 包（`liveshare` 只是 README 里的举例，未发布） |

→ **“两个完整引擎共享同一个会话”在 DSH 里不存在**。硬要并发，只会交错 seq、互相覆盖。

## 二、官方支持的两种“同一会话”形态

| 形态 | 能不能 | 条件 |
|---|---|---|
| **一个引擎 + 多个客户端并发读写**（连接和写入都真的生效） | ✅ 官方支持 | 每个通过认证的客户端都是 **owner**（`dsh-client-connection`：browser Peer 由认证浏览器共享，principal=owner；`/connect` 的 API Peer 同为 owner）；一条 mux WebSocket 多路复用；引擎内部把并发写串行化；自带 follow-before-page + 缺口修复 + `requestId` 幂等 |
| **引擎接力**（A 完全退出 → B 接手） | ✅ 可行但串行 | 释放内核锁后，B 用 `dsh-headless --session-id` 或 `dsh-acp session/resume` 接手；要求 cwd/preset 一致、无存活写者 |
| 两个引擎并发写同一会话 | ❌ | 锁 + 无合并路径 |

**还缺的（官方明确列为延期）**：跨进程租约/邮箱、跨进程变更可见、job/终端不可迁移、附件只在本机、只读共享未产品化（无第二个 principal kind）、审批/提问只有 owner 能答。

**一句话**：所谓“镜像会话”，官方等价物不是“把会话复制到手机”，而是**手机作为客户端连电脑引擎**。

## 三、目标架构（App 级）

```
手机 App（原生 UI）
├─ 本地 DSH 运行时（proot/JNI，单机、离线可用）     ← 抄 DSHA
│    └─ 本地会话（手机自己产出的，落手机本地）
└─ 远程会话客户端（DSH client 协议：mux WS + RPC）  ← 抄 xHarness
     └─ 连电脑的 DSH（唯一引擎/唯一写者）
          ├─ 会话列表 / 历史 / 流式 / 工具卡 / diff
          ├─ 审批（允许一次/拒绝）、提问（单选/多选/自定义）
          └─ 工作区文件（就是电脑那份，天然同一份）
```

- **“同一个会话”= 真的只有一个引擎**（电脑），手机是它的 owner 客户端：两端同时读写都生效、不漂、不需要同步逻辑。
- **“手机上也是完整 DSH”= App 内置本地运行时**：没网时开的会话走本地引擎；连上电脑后 UI 里多出“电脑”这一栏。
- **文件**：远程会话天然是电脑工作区；手机本地文件走 App 内上传（`fileUploads`）；电脑产物在会话里预览/下载。
- **设备感知**：App 上报前台会话/设备/网络，电脑侧经 `system-prompt` 注入（“用户在手机、正在看会话 X”）。

## 四、App 底座怎么选（这是要你拍板的一件事）

| 方案 | 现成的东西 | 要补的 | 判断 |
|---|---|---|---|
| **① fork xHarness**（Flutter，MIT，2.7.0） | 手机端**全部**：连接/配对/证书固定、会话列表、流式、工具卡、diff、审批、提问、多电脑、SQLite 缓存 | 塞进**本地 DSH 运行时**（Android 上跑 proot + dsh，可借 DSHA 的做法）；Windows 连接器（它的安装器只有 Linux/systemd） | **推荐**：手机端最难的部分已经有人做完且 MIT |
| **② fork DSHA**（Kotlin，MIT，3.1k★） | 本地 DSH 运行时 + 移动 UI + 设备能力桥（3090）+ LAN 代理 | 从零写**远程会话客户端**（DSH client 协议）+ Windows 连接器 | 不推荐：等于自己写一遍 xHarness |
| **③ 自研 App** | 无 | 全部 | 只有前两条都被否时才考虑 |

## 五、PC 侧要做什么（两条路都要）

1. **暴露引擎**：DSH 的 `web-app` 已把 GUI 发布到 HTTP(S)（跨机访问是设计内的）；配 `trustedHosts`/`connection.authenticatedUrl` 拿到带令牌入口；
2. **传输**：Tailscale serve 提供 HTTPS/WSS（不公网、不加端口映射）；或照 xHarness 做一次性二维码配对 + 设备密钥 + 固定证书；
3. **Windows 连接器**：xHarness 只提供 Linux/systemd 安装器 —— 这是我们要补的第一块（Python/Node，读 DSH 令牌、生成配对二维码、WSS 转发、设备撤销）。

## 六、里程碑

| 里程碑 | 内容 | 验收 |
|---|---|---|
| **M0（1 天）** | Windows 连接器最小版：读令牌、配对、WSS 转发；用现成 xHarness App 连上 | 官方 xHarness App 能连我们的电脑（不需要改 App） |
| **M1（3–5 天）** | fork xHarness：本地 DSH 运行时接入（Android proot），App 内可离线新建会话 | 飞行模式下 App 能单机跑一个会话 |
| **M2（2–3 天）** | 会话列表合并（本地+电脑）、状态标识、切换 | 一屏看到两类会话，不混淆 |
| **M3（2 天）** | 文件：本地文件上传给电脑会话；电脑产物下载/预览 | 手机照片丢给电脑 AI；AI 产出的文件在手机上打开 |
| **M4（2 天）** | 设备感知注入（在手机/在电脑/看哪个会话） | 问 AI“我在哪”答对 |

## 七、风险

| 风险 | 对策 |
|---|---|
| 在 Android App 里跑完整 DSH（proot 体积/启动/电耗） | 直接抄 DSHA 的 proot 与启动契约（它已验证）；M1 只做“能起来” |
| 客户端协议随 DSH 版本变 | 锁 DSH 版本；协议差异做能力探测，不猜字段 |
| 两个方向（本地/远程）UI 混淆导致误操作 | 会话卡片强制标“本机/电脑”，危险操作前显示目标设备 |
| 连接器暴露控制权 | 只走 tailnet；设备密钥 + 可撤销；审计日志 |
