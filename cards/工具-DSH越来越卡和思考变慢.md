# 工具-DSH越来越卡和思考变慢

> **触发**：DSH 用久了越来越卡/慢、内存涨、每个对话的思考时间变长；想量「新会话为什么慢」；想改默认模型
> **锚点**：`DeepSeek Harness`、`.dshw-usage`、`session.v4.jsonl.zstd`、`agentPresets`、`cordis.patch.yml`、`archived-session`、`session/create`、`卡`、`慢`
> **验证**：重启后空闲 CPU 换一个量级（`Get-Process` 前后比）

## 首选

量空闲是否失控（DSH 没在跑会话时应该接近 0）：

```powershell
$p = Get-Process -Id <pid>; $c1=$p.CPU; Start-Sleep 10; $p.Refresh()
"$([math]::Round($p.CPU-$c1,2))s / 10s"
```

量宿主建会话的真实耗时：用 qq-bridge 的 `NodeApiClient` 打 `session/create`（`{cwd}` 即可），同机实测 2.4–2.7s。

改默认模型不走 GUI：改 `~/.dsh/profiles/desktop/cordis.patch.yml` 里 `agent-default-model` 的 provider/model/reasoningEffort，保存后宿主**热重载**，无需重启（写 `~/.dsh` 需 danger-full-access）。

## 被挡时

- 工具注入多（一次 assemble 79~82 个，其中 `mcp__snowluma__qq_*` 约 40 个、定义约 15K token）→ 按会话类型裁剪 MCP，别全量挂载。
- `workspace/archiveSession` 只隐藏不释放 → 想真正降内存/降 CPU 只能**重启 DSH**。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| 以为归档会话能省资源 | archived-session gate 只拒绝后续步骤，agent 常驻 |
| 改 `agentPreset: minimal` 想加快建会话 | 实测一样 2.4–2.7s，慢的不是 preset |

## 注意

- 空闲 CPU 高的真凶是**常驻 agent 数量**：`fish-memory-diag.log` 的 `tick：agents=N` 出现过 N=33~46，每隔几分钟全量巡检。
- 别把「慢」归因到上下文超窗：常驻群会话实测每步稳定 ~87K（窗口 1,048,576）。量上下文读 transcript 的 `data.usage`，别用 `.dshw-usage.json` 的 `tokens`（计费口径、漏离线时段）。

证据：2026-10-28 PID 28104 空闲 38% 单核 / 6380s CPU（21.6h）；群会话 524 步稳定 87K