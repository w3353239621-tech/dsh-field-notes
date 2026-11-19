# 脚本-PowerShell中文与参数陷阱

> **触发**：写 .ps1 输出中文、传参、起后台进程、按命令行杀进程；或批量复制 node_modules 后体积暴涨
> **锚点**：`powershell`、`UTF-8 BOM`、`$Pid`、`SessionStateUnauthorizedAccessException`、`字符串缺少终止符`、`schtasks`、`Win32_Process`、`robocopy`、`/XJ`、`dir /AL`
> **验证**：脚本跑出来中文不乱码、参数有值、后台进程真起来了（心跳/日志在涨）

## 首选

- 中文 .ps1：写成 **UTF-8 with BOM + CRLF**（PowerShell 5.1 读无 BOM 文件按 ANSI/GBK 解）。
- 后台常驻且要脱离 DSH：`schtasks /create` + `/run`；要传参再 `Start-Process`。
- 复制带 junction 的 `node_modules`：`robocopy /E /J /XJ`。
- 验链接：`cmd /c dir /AL "<父目录>"` → `name [target]`。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| `param([string]$Pid)` | `$Pid` 是只读自动变量 → `SessionStateUnauthorizedAccessException`，整个函数返回空；改名 `$GamePid` |
| heredoc 内容末尾是 `'REPORT'` | 4 个连续单引号被解析成 `'''`+`'` → `SyntaxError` |
| `Invoke-CimMethod Win32_Process Create` 起 pwsh -File | 立即退出无日志；改 schtasks 或 Start-Process |
| 反复 `schtasks /run` | 每次都新建实例，多实例并行写同一日志；先查实例数 |
| `Get-CimInstance | Where CommandLine -match 'xxx'` 就杀 | 会把 DSH 自身子进程一起匹配掉（job 退出码 4294967295）；只按明确 PID + `Name='powershell.exe'` |
| `shutil.copytree` / `cp` 复制 node_modules | junction 会被解引用成实体目录，体积暴涨；`ls -ld` 也显示 `d`、`stat %h=1` 看不出 |

## 注意

- 沙箱里 `Get-ScheduledTask` 返回 0 条、`schtasks /query` exit 1、`Get-CimInstance` 拒绝访问 —— 这不是系统没任务，是沙箱挡住；计划任务只能让用户开管理员 PowerShell 或 `taskschd.msc` 核实。
- 脚本重写时容易漏 `param` 块，漏了 `Start-Sleep $null` 会静默空转刷日志；启动后看 60s 心跳节奏验证。

证据：`procedures/_inbox.md` 2026-11-07 条目；`cleanup-tier1.ps1`、`_pwsh/`
