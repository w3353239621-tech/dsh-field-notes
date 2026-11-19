# 工具-DSH配置改了不生效

> **触发**：改了插件配置、调低阈值、挂了服务，重启后决策毫无变化或 `ctx.get` 永远是 null
> **锚点**：`ctx.get`、`ctx.provide`、`isolate`、`toolResultPruner`、`globalThis`、`agent.ctx`、`policy-loaded`、`cordis.patch.yml`
> **验证**：账本/诊断行里出现的是你写的那份配置值，而不是默认值

## 首选

1. 先分清是**哪一份 mount** 在读：bundle 的 root 行和 gate 重写出的 preset 行是**两个实例**，只有 preset 行收得到 agent 事件。
2. 服务要跨作用域：让能看见它的 mount 在构造里 `ctx.provide("x", this)`，再把对象发布到 `globalThis` 或共享服务。
3. 进程级共享配置要在**所有 mount 构造完之后**读，或入口懒重试。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| 只写 `static provide = "x"` | 不注册服务，`ctx.get("x")` 永远 undefined，`ctx.inject(["x"], cb)` 永不触发 |
| 在 root 行 `ctx.get("toolResultPruner")` | `@deepseek-ai/dsh-web-app/cordis.patch.yml:550` 在 root 禁用它，只有 agent preset 挂；得顺 `agent.ctx` |
| preset 里 `isolate:{toolResultPruner:true}` 后在根上查 | 服务被关在组内，root 与 `agent.ctx` 都拿不到；但对象引用本身可跨作用域传 |
| 改 root 行 config 期待 preset 读到 | 两个实例各读各的；症状是账本毫无变化但恰好有一行刚越过默认阈值 |

## 注意

- 每次会话第一次决策落一条 `policy-loaded-*` 诊断记录，是唯一可靠的「配置到底进没进去」证据。
- 症状「代码在跑、决策也记账，但那一档永远静默 return」= 服务拿到的是 null，不是逻辑错。

证据：`procedures/_inbox.md` 2026-11-07 作用域条目；`~/.dsh/compaction-owner/ledger/`
