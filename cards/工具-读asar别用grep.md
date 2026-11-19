# 工具-读 asar 别用 grep

> **触发**：要读 DSH 自身实现（`D:\DEEPSEEK\resources\app.asar`），想知道某个函数在哪个文件、某段逻辑怎么写的
> **锚点**：`app.asar`、`grep -a`、`header`、`README.zh.md`、`dsh/node_modules/@deepseek-ai`、`lib/client.js`、`213MB`、`ENOENT`
> **验证**：能列出 asar 内目录并 `cat` 出单个文件，且输出里没有二进制垃圾

## 首选

先解析 asar 头列目录，再按文件读：

- 偏移 4 = 头部 pickle 长度；头内偏移 4 = JSON 长度；**JSON 从偏移 8 开始**（差 4 字节就 `JSON.parse` 失败，且报错会灌整个 header）。
- 实现：`dsh/node_modules/@deepseek-ai/*/lib/client.js`；文档：同包 `README.zh.md`。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| `grep -a "xxx" app.asar` | 213MB 全文件扫约 1 分钟，命中位置的中文注释还错位，读不出上下文 |
| 从偏移 0/4 开始解 JSON | 少算 4 字节 pickle 前缀 → `JSON.parse` 直接失败 |

## 注意

- 桌面端 0.2.2-rc.1 起 Electron 主进程/预加载**编译进 `DeepSeek Harness.exe`**，asar 顶层只剩 `/dsh`；`grep -ac "enterWorkspace" "...exe"` 返回 0 就说明已编译，改 `main.js` 那套老方案失效，可动手层只剩渲染层 DOM 和 Cordis 插件。

证据：`procedures/_inbox.md` 2026-11-07/11-08 条目；`_scan_dshlib.cjs`、`_extract_client_ui.cjs`
