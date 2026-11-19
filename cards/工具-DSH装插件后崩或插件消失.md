# 工具-DSH装插件后崩或插件消失

> **触发**：给桌面版装/改插件后起不来、插件页和工具全空、`install_bundle` 返回失败或「没变」，但包明明装上了
> **锚点**：`install_bundle`、`approvedBuilds`、`ambiguous-install`、`stale-approval`、`ERR_PNPM_IGNORED_BUILDS`、`sanitizeProfile`、`dsh.profile.bundles`、`peerDependencies`、`pnpm-lock`
> **验证**：重启后插件行是 `enabled`、工具列表出现、日志无 `row.disabled`

## 首选

1. 插件包把 `@deepseek-ai/dsh-*` 写进 `dependencies` → lock 钉死旧核心包，profile 根被 hoist 回旧版 → 恢复：整目录移到 `.stale-core-<date>`；根治：改 `peerDependencies` 后 `pnpm install --no-frozen-lockfile`（会 `+N -22`）。
2. `install_bundle` 报 `pendingBuilds`：重试带 `approvedBuilds:["<pkg>@<version>"]`（不带版本 → `stale-approval`）。
3. 插件消失了：`sanitizeProfile` 把 `dsh.profile.bundles` 砍回 base+web-app，但不动 dependencies —— 把包名写回 `package.json` 的 `bundles` 数组再重启。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| 改完代码、版本号不变就重 pack + install | 依赖 spec 是 `file:.../-<version>.tgz` → `ambiguous-install`/`changed:false`，装的是旧字节；换版本号，装完 diff 已装副本 |
| 只补 `cordis.patch.yml` 的覆盖行 | bundle 自己的 patch 层没加载，补了也没用 |
| 去 profile patch 里 grep 客户端插件的行 | bundle 型客户端插件**不写** profile patch，patch 由包自带在启动时合并；grep 不到是正常 |
| 对 unmanaged 插件的 `cordis.patch.yml` 做临时配置 | 下次 `install_bundle` 会被包内版本覆盖；临时配置放在**最后一次安装之后**写，或写 profile 覆盖层 |
| 以为 `set_bundle` 关再开能热重载 | `restart-required` 只能重启 DSH |

## 注意

- 判据：`<profile>/node_modules/@deepseek-ai/*` 的 LastWriteTime 对上 `.plugin-manager/logs/operation-*/pnpm.log` 里 `+ <pkg>` 的时间，就是被 hoist 的旧核心包。
- 运行时 pnpm 不在 `node/bin`：在 `~/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.cjs`，node 在同级 `dependencies/node/bin/node.exe`。
- `link:` 插件在 `profiles/*/node_modules` 下是 junction，文件工具读报 `PATH_RESTRICTED` → 用 shell 的 node + `fs.realpathSync` 再读。

证据：`procedures/_inbox.md` 2026-11-07 插件条目；`~/.dsh/plugins/.../pnpm.log`
