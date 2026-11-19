# 网络-QQ桥接与远程访问

> **触发**：重启 DSH 后 QQ 消息发不出、`qq_send_*` 全 `fetch failed`；或手机/固定域名打开页面满屏乱码
> **锚点**：`bridge.lock`、`bridge.log`、`3100`、`fetch failed`、`socialV2`、`x-console-token`、`dsh-market.com`、`gzip`、`qq-tool-restrict.mjs`
> **验证**：`3100` 有监听且 `bridge.lock` 的 PID 活着；固定域名页文字正常

## 首选

- 桥接没起来：先看 `state/bridge.lock` 的 PID 是否还活着、`bridge.log` 是否只有一句「DSH 事件流已结束」。
  修：`powershell -File D:\qq-bridge\start-hidden.ps1 -WaitSeconds 150`（先杀旧锁 PID → 起隐藏守护 → 等 bridge.lock）。
- 二代 AI 不醒（暂停被持久化）：`POST http://127.0.0.1:3100/api/socialV2/activity`，头 `x-console-token: $(cat state/console-token)`，体 `{"paused":false}`。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| 以为重启 DSH 会顺带重启桥接 | 不会；MCP 工具全是 `fetch failed` |
| 重启后仍照旧发消息 | `socialV2.paused` 已存进 `social-v2.json`，重启后仍是暂停，各群会话不醒 |
| 把固定域名乱码当加密/证书问题 | 是浏览器用**明文 http** 请求该源，gzip 的 JS 没解压被当 latin1 渲染；壳按 `location.protocol` 拼 http 交付 |
| 用本机 HTTPS 失败推断手机也坏 | 本机 schannel `SEC_E_NO_CREDENTIALS` 只证明本机；判据是「局域网二维码能开而固定域名乱码」 |

## 注意

- 工具白名单（`qq-tool-restrict.mjs`）漏掉 `compress` 这类**上下文管理工具**最贵：模型可见却永远被拒 → 同参原地重试，每步付 60~65 万缓存输入。规则：上下文类工具要么放行（`LOCAL_EXECUTION_TOOLS`）、要么从 schema 隐掉。
- 加失败熔断：同工具连失 3 次就在唤醒提示里写「停止重试」。

证据：`procedures/_inbox.md` 2026-10-31/11-07 QQ 桥接条目；`D:\qq-bridge\src\dsh-client.js`
