# OCG策略缓存-嵌套子进程改写owner导致中断

> **触发**：跑 opencode-go 模型时，在工具调用（`run_code` / bash）里嵌套启动 DSH 子进程（spawnSync / node 脚本 / 任何继承工具环境的方式），桌面端偶发本轮失败
> **锚点**：`Blocked until your workspace's policy loads from OpenCode Console`、`XDG_CACHE_HOME`、`OPENCODE_API_KEY`、`opencode-console`、`ELECTRON_RUN_AS_NODE`、`reg query HKCU\Environment`、`UNKNOWN`
> **验证**：给子进程独立 `XDG_CACHE_HOME` 后跑一次嵌套，exit 0 且正常出结果；再隔一次桌面端同步（TTL 60s）复跑仍不中断

## 首选

嵌套 spawn 时给子进程独立缓存根，绝不与桌面端共享：

```js
env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', XDG_CACHE_HOME: 'C:\\Users\\<u>\\AppData\\Local\\dsh-nested-cache' }
```

需要父子同身份时，用 `reg query HKCU\Environment /v OPENCODE_API_KEY` 把 key 读回来注入（工具进程里该变量已被 DSH 清空），包一层 `spawn({ env })` 的 helper，参数是「缓存根 + 是否共享身份」。

彻底根治：只留一种凭证 —— 删掉用户级 `OPENCODE_API_KEY`，统一走浏览器登录，父子身份自然一致。

## 被挡时

1. 只能共享缓存时，`hasEnvKey` 必须为 false（不注入 key），让子进程走登录身份。
2. 缓存目录被清过就先跑一次正常会话预热，再跑嵌套。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| 以为「缓存过期」会中断 | 不会。TTL 60s 过期走后台刷新，只有「查不到本身份记录」才 fail-closed 等 3000ms |
| 改 `~/.cache/opencode-console/config.json` 的 owner | 会被下一次同步覆盖，且身份字符串由凭证算出来 |
| 在旧终端里重启 DSH | 旧终端环境块还留着 key，改了等于没改 |
| 用 `powershell.exe -File` 跑含中文的 `.ps1` | Windows PowerShell 5.1 按 ANSI 读 UTF-8 无 BOM 文件，中文串炸引号 → 用 `pwsh` 或写 BOM |

## 注意

- 报错原文是 `Blocked until your workspace's policy loads from OpenCode Console`（code `UNKNOWN`），约 3 秒后本轮失败，过一会又自己恢复 —— 它不是网络问题，是身份查不到。
- owner 的两种形态：key 身份 `["https://opencode.ai/console","<sha16>",null]`；登录身份 `["https://opencode.ai/console","user_...","org_..."]`。两者不相等就会中断。
- 判据是「嵌套子进程用的缓存根与桌面端不同」，不是「有没有报错」——偶发恢复最容易骗过人。
