# 脚本-统计token用量和判断渠道

> **触发**：要统计某天的 token 消耗 / 查某模型花没花钱 / 问「我这个用量准不准」
> **锚点**：`.dshw-usage.json`、`session.v4.jsonl.zstd`、`28 b5 2f fd`、`zstdDecompressSync`、`inputTokens`、`-1017`
> **验证**：解出的 transcript 行数 > 0 且能读到 `data.usage.totalTokens`，与早前记录可比

## 首选

真值在 transcript，不在 UI 台账：

```js
// 关键是 zstd 多帧：不能当单帧解
const MAGIC = Buffer.from([0x28,0xb5,0x2f,0xfd]);
let frames=[], i=0;
while (i < buf.length) { const j = buf.indexOf(MAGIC, i+1); const end = j===-1?buf.length:j;
  frames.push(buf.subarray(i,end)); i = end; if (j===-1) break; }
let text=''; for (const f of frames) { try { text += zlib.zstdDecompressSync(f).toString('utf8'); } catch{} }
// 用量字段：每行 assistant/message 的 data.usage
// { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, totalTokens }
```

上下文体积 = `inputTokens + cacheReadTokens + cacheWriteTokens`。

## 现成工具（别再手写一遍）

`scripts/token-audit.mjs`（default-workspace 下，2026-11-14 建）：

```bash
node scripts/token-audit.mjs                      # 最近 30 天，打印每日/工作区/模型/小时/上下文分布
node scripts/token-audit.mjs --days 7 --json out.json
```

- 按文件 mtime+size 缓存到 `_token-audit/cache/steps.cache.json`：627 个会话首跑约 1–2 分钟，之后约 13 秒。
- session id = 会话目录名去掉 `session-` 前缀（目录名不是 uuid）。
- 2026-11-14 基线：42,414 次调用 / 3.73B 上下文（未缓存 215M + 缓存 3,512M）/ 命中 94.2% / 输出 27.8M / 每次 p50 78K / 日均 1,697 次。

## 交叉校验（两路独立口径）

`%USERPROFILE%\.dsh\storages\session_projcache\sessions\*.json` 里 `record.rows.tokenUsage.val.totals` 是每会话累计（`uncachedInputTokens` / `cacheReadTokens` / `outputTokens`），全量求和后：**窗口值应占全量的 <100%**（本次 25 天窗口占 缓存 76.7% / 未缓存 87.1% / 输出 91.8%，合理）。若接近 100% 或超出，说明解帧漏了。

## 被挡时

- 没有 node 的 zstd：逐帧解压逻辑同上，换任意能按魔数切帧的解压实现即可。
- `.dshw-usage.json` 可作**趋势参考**（有 `ts/model/cost/tokens` 事件流），但只记 UI 在线时段。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| node `zlib` 流式解压整个 `.zstd` | 多帧拼接，只吐第一帧随后 `Unknown frame descriptor` |
| 拿 `.dshw-usage.json` 的 `tokens` 当上下文大小 | 它是计费口径，且漏记 UI 离线时段，实测漏 30%+ |
| 只看 `cost` 判断有没有花钱 | 按 DeepSeek 价目表给百度线也估了钱，会误判 |
| 拿 `.dshw-usage.json` 的 25 天总量（¥486 / 4.27B）估套餐容量 | 那是「每轮累计」口径，一个请求记一次累计值，与真实调用数差一个数量级（真实 42k 次调用 / 3.73B） |

## 注意

- 模型名带 `-1017` 的是**百度渠道**（`source.provider = baidu`），不扣 DeepSeek 余额。
- 单次请求 token 会因会话不同差几个数量级（几百 K 到 8M+），做汇总时先按会话分组再比较，别混平均。

证据：2026-10-27 建立，2026-10-28 复用于 DSH 性能诊断