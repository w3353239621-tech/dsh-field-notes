# 工具-DSH桌面端启动失败

> **触发**：桌面版弹「无法使用」/白屏/一开就崩，`crash` 日志只有一句；或崩溃后配置全没了、旧会话打不开
> **锚点**：`Web authentication failed`、`431`、`startup failed`、`1 required plugin did not activate`、`dsh-auth-`、`sanitizeProfile`、`cordis.patch.yml.bak-`、`agent-preset/invalid`、`unknown key "owner"`
> **验证**：能说清是哪一层崩（cookie 头 / 插件行 / preset 构造），且改完重启后同一入口不再复现

## 首选

按报错原文分诊：

- `Web authentication failed` + host 已 ready：**不是登录坏了**。 chromium cookie 库积了多条 `dsh-auth-<sha256(127.0.0.1:port)>`（每条 227B，超 16KB 头 → host 回 431）。
  修：删这些 cookie；profile patch 给 connection 行加 `cookieMaxAgeDays: 1`；兜底 `NODE_OPTIONS=--max-http-header-size=131072`。
- `startup failed: 1 required plugin did not activate`：见卡「工具-DSH装插件后崩或插件消失」（旧核心包 hoist）。
- `agent-preset/invalid: ... unknown key "owner"`：基座 `BasicCompactionConfig` 硬拒未知键，preset mount 构造即 throw。修：`const { owner, ...baseConfig } = config` 后再 `super(ctx, baseConfig)`，重启。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| 崩溃后重写 `cordis.patch.yml` | 恢复流程会先把它改名成 `cordis.patch.yml.bak-<ms>` —— 先去 profile 目录找 bak-*，抄回来 |
| patch 只写 `cookieMaxAgeDays` | patch 是**整段替换 config**（`target[key]=value`），必须连 `trustedHosts` 一起写，否则丢 |
| 在运行中的 TUI 里改 `.dsh-tui/cli` 的 package.json 再 pnpm install | 工具 worker 仍按旧 `.pnpm` 路径解析 → `Cannot find module ...dsh-ptc-runtime-node\lib\process.js`，run_code 全废；用 TUI 内 `/update`，必须手改就退出 TUI 再装 |

## 注意

- 0.2.2-rc.1 的 host 硬编码 `--port 0`，cookie 名每次启动都不同 —— 不删旧 cookie 会稳定复发。
- CLI 无法 boot desktop profile 验证（Electron 独占），所以只能通过重启桌面端来验。

证据：`procedures/_inbox.md` 2026-11-07 启动/配置丢失条目；`asar lib#main.js:3531`
