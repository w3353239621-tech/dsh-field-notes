# 工具-DSH刷新按钮暂时无法重建界面

> **触发**：点 dsh-unlag 刷新按钮弹「暂时无法重建界面，稍后再试」；`/dsh-unlag/reload` 恒返回 `"status":"unavailable","rebuild":"unsafe"`；重启桌面端也不恢复
> **锚点**：`did not activate` / `Invalid package` / `.asar` / `Failed to parse header` / `dsh-hmr` / `readdirp`
> **验证**：`POST /dsh-unlag/reload` 返回 `"status":"done","completion":"full","healthReadable":true,"failedEntries":[]`

## 首选

答案只在 **host stderr**（unlag 自己的 log 不记这段）。用 IPC stdio 直连 dsh-desktop-host 复现：

```
spawn('D:\DEEPSEEK\DeepSeek Harness.exe',
  ['--expose-internals', <app.asar>\dsh\node_modules\@deepseek-ai\dsh-desktop-host\lib\index.js, <rt>, <prof>, <primary>, <pnpm.mjs>, <bin>],
  { env: {...process.env, ELECTRON_RUN_AS_NODE:'1'}, stdio:['ignore','pipe','pipe','ipc'] })
```

命中 `hmr (@deepseek-ai/dsh-hmr): Error: Invalid package <x>.asar` → 把 `~/.dsh` 根目录所有 `.asar` 移走，重启桌面端即恢复。

## 被挡时

- asar 被运行中的应用占用删不掉：写纯 ASCII 的 `.cmd`，`tasklist` 轮询等应用退出再 `del`（会话跑在应用里，自己删不掉）。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| 怀疑 app.asar 被 patch 坏 / pnpm 升级 / profile patch | 逐个替换后 /reload 仍 done，差异源只在 home 目录 |
| `grep build_v2` 找引用者 | 无任何配置引用；是启动期 readdirp 递归扫 `~/.dsh` 把 `.asar` 当归档解析 |
| `--user-data-dir=...` 开第二实例 | `bad option: --user-data-dir`，该 exe 不认；只能 IPC stdio |
| 无头探针 | 复现不出来，必须带 ipc channel + 真实 DSH_HOME |

## 注意

- 链条：坏 asar → Electron asar 层解析失败 → **dsh-hmr 条目激活失败** → `ctx.get('hmr')`=null → `hmrService()===null` 直接回 unavailable。文案指向界面，根因在插件激活。
- hmr 激活失败**不落盘**：main 只把 host stderr 存内存末 64KB。
- 别再往 `~/.dsh` 根目录丢大归档，扫描是递归的，放子目录也躲不掉。
