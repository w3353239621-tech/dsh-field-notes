# 模型-模型自己OCR读图而没拿到像素

> **触发**：模型明明是多模态，却「看不到附件 / 说没有图片 / 自己写 PowerShell 跑 Windows.Media.Ocr 去认字」；或者选择器里同一模型时好时坏。DSH 渠道插件（credit-hub/workbuddy 等）下的图「消失」。
> **锚点**：`inputModalities` / `supportsImages` / `image omitted because this model accepts text only` / `projectImagesForTextModel` / `v3/config` / `image-dropped` / `staticCatalog`
> **验证**：在怀疑的车道上 `read_image` 一张有细节的图，自己描述内容 —— 描述得出=像素到了；只会说「dimensions / 看不到」=被投影成占位文本。日志里看 `目录来源 live|static|last-known-good` 与 `vision N 个`。

## 首选

```
# 1. 确认上游真的声明了多模态（wb 例）
#    GET https://copilot.tencent.com/v3/config → row.supportsImages === true
# 2. 插件侧改三处（dsh-credit-hub/src/workbuddy.js）
#    staticCatalog 每条补 vision: true
#    降级目录 TTL 30s（LIVE 仍 10min），降级结果别缓存 10 分钟
#    成功目录落盘 workbuddy-models.json 作 last-known-good，降级优先用它
# 3. node --check + test/run.mjs 后重启 DSH 宿主（无热重载）
```

## 被挡时

- 只想立刻恢复：重启 DSH 让 `/v3/config` 重新拉成功即可，别去改 profile yml（provider 是插件运行时注册的）。
- 查不到日志：插件 `degradationWarned` 按 reason 去重、降级结果又缓存 10 分钟，事后无痕 —— 直接看 `~/.dsh/credit-hub/workbuddy-models.json` 与 logs.jsonl 的 `目录来源` 行。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| 翻会话 transcript 找 `inputModalities` | 只记 provider/model/contextWindow，不记模态；`/api/*` 未带 cookie 全 401 |
| 找 credit-hub diag 的 11128 请求体当证据 | 那是拦截请求的转储，里面根本没有 image_url |
| 以为「附件没上传」或 read_image 坏 | 工具结果里 image 块是真的，出站前才被换掉 |

## 注意

- 机制：渠道把模型声明成 `['text']` → `@deepseek-ai/dsh-llm/lib/index.js:2342` 用 `projectImagesForTextModel` 把 image 块换成 `[image omitted because this model accepts text only; attachment sha256:…]`，模型只能退回 OCR。**不是模型不会看图。**
- 判据：`row.vision === true ? ['text','image'] : ['text']`（workbuddy-adapter.js）—— 唯一的开关就是这个布尔。
- 名称陷阱：官方 `deepseek-v4.1-flash-1017` 与 wb 的 `wb-deepseek-v4.1-flash` 是两个 model id，跨渠道对照无效。

证据：session-c914f142 2026-11-13T11:31Z（text-only）vs 11:43Z（恢复）；`~/.dsh/credit-hub/logs.jsonl.old` 2026-11-12T04:00:19Z 的 `v3/config 拉取失败（fetch failed），先用静态清单`