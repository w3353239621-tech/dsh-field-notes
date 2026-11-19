# OCG策略缓存-嵌套子进程改写owner导致中断

## 触发条件

DSH 跑 opencode-go 模型时，在工具调用（run_code/bash）里嵌套启动 DSH 子进程（spawnSync / node 脚本 / 任何继承工具环境的方式），随后桌面端偶发：

`Blocked until your workspace's policy loads from OpenCode Console`（code UNKNOWN），约 3 秒后本轮失败，过一会又自己恢复。

## 首选姿势

嵌套 spawn 时给子进程独立缓存根，绝不与桌面端共享：

```js
env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', XDG_CACHE_HOME: 'C:\\Users\\<u>\\AppData\\Local\\dsh-nested-cache' }
```

需要父子同身份时，再用 `reg query HKCU\Environment /v OPENCODE_API_KEY` 把 key 读回来注入（工具进程里该变量已被 DSH 清空）——包一层 `spawn({ env })` 的 helper 即可，参数是「缓存根 + 是否共享身份」。

彻底根治：只保留一种凭证（删用户级 `OPENCODE_API_KEY`，统一走浏览器登录），父子身份自然一致。

## 反面清单

- 以为「缓存过期」会中断：不会。TTL 60s 过期走后台刷新，只有「查不到本身份记录」才 fail-closed 等 3000ms。
- 以为改 `~/.cache/opencode-console/config.json` 的 owner 能修：会被下一次同步覆盖，且身份字符串由凭证算出来。
- 在旧终端里重启 DSH：旧终端环境块还留着 key，改了等于没改。
- 用 `powershell.exe -File` 跑含中文的 `.ps1`：Windows PowerShell 5.1 按 ANSI 读 UTF-8 无 BOM 文件，中文串炸引号 → 用 `pwsh` 或写 BOM。

## 验证方式

1. `work/check-ocg-process-env.ps1`：读 DSH host 的 PEB 环境块，看 `hasEnvKey` 与 `cacheIdentityMatches`。
2. 共享缓存跑一次嵌套（`XDG_CACHE_HOME=C:\Users\<u>\.cache`，不注入 key）：exit 0 + 输出正常 + owner 前后不变。
3. owner 两种形态：key 身份 `["https://opencode.ai/console","<sha16>",null]`；登录身份 `["https://opencode.ai/console","user_...","org_..."]`。