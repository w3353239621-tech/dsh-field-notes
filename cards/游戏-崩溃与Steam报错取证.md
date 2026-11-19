# 游戏-崩溃与 Steam 报错取证

> **触发**：游戏闪退/黑屏/无法启动，或弹「无法初始化 SteamAPI / 请确保 Steam 运行中」，试过重装和校验文件都没用
> **锚点**：`HuntGame.exe`、`Game.log`、`LogBackups`、`crycrash`、`LocalDumps`、`steam_api`、`-applaunch`、`EAC`
> **验证**：能说出「谁报的错 + 进程怎么死的 + 日志最后一行是什么」，而不是又给一套重装流程

## 首选

按这个顺序取证，别先给方案：

1. **先看是谁报的错**：Windows 错误框（红 ×、标题「错误」+「退出」）是游戏 exe 自己弹的，不归 Steam 客户端管 —— 「删 steam.cfg / 重启 Steam / 校验文件」在同一层面之外，注定无用。
2. 进程：任务管理器看启动命令行与父进程；`Hunt` 的进程名是 `HuntGame.exe`（不是 hunt.exe），WER `LocalDumps` 键和事件匹配都用它。
3. 日志：`<游戏目录>\USER\Game.log`，退出后轮转进 `USER\LogBackups\Game Build(39) <日期> (<时间>).log`，**日志内时间戳是 UTC**。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| 一上来就「重装 Steam / 校验文件」 | 报错是游戏进程拿不到 Steam 会话，客户端本身正常 |
| 只看「崩溃」二字就找 crash dump | 两次硬断均无 WER/TDR/dump、`crycrash_error.log` 只有启动头 = 进程被外部静默终止，方向是 EAC 误杀/显卡不稳 |
| 进程已退还等 ExitCode | 拿不到，监控只会记 [GONE]；改看 Game.log 尾部 |

## 注意

- 干净退出的判据：Game.log 尾部有 `Success: System removed from context ... Cry::Audio::CSystem` + 大批 `unloading flashplayer for layout`；真崩溃是日志硬断、没有这套卸载序列。
- 「无法初始化 SteamAPI」的三大根因：① 绕过 steam.exe 双击 exe 起的；② 游戏 exe 与本机 Steam 不是同一安装/账号；③ 权限或杀软拦 IPC。

证据：`procedures/_inbox.md` 2026-11-07 猎杀对决/Steam 条目
