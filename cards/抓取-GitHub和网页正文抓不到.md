# 抓取-GitHub和网页正文抓不到

> **触发**：想读 GitHub 上的源码/README/issue，或抓某站正文/下载文件，结果只拿到导航栏、403、fetch failed、或搜索返回垃圾
> **锚点**：`raw.githubusercontent.com`、`cdn.jsdelivr.net`、`api.github.com`、`403`、`fetch failed`、`github`、`Crowdin`、`page-data.json`
> **验证**：拿到的正文里有函数名/配置项/issue 正文，不是只有 nav 和 footer 的 HTML 壳

## 首选

GitHub 文件：优先 jsdelivr（比 raw 稳，还能列目录）

```bash
# 读文件
https://cdn.jsdelivr.net/gh/<owner>/<repo>@<branch>/<path>
# 列目录（返回 HTML 目录页）
https://cdn.jsdelivr.net/gh/<owner>/<repo>@<branch>/
```

查 issue / 维护者原话走 API，别走网页搜索：

```bash
api.github.com/search/issues?q=repo:<o>/<r>+<词>        # 拿 number/title/state
api.github.com/repos/<o>/<r>/issues/<n>/comments       # 读正文
api.github.com/repos/<o>/<r>/git/trees/main?recursive=1  # 文件清单
```

## 被挡时

- raw 不通先重试一次，再退 jsdelivr；都不通走 `web_fetch` 的 api 接口
- 百度系文档正文在 `bce.bdstatic.com/p3m/bce-doc/online/.../page-data.json` 的 `markdownRemark.html`

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| 抓 `github.com/<o>/<r>` 页面正文 | 只拿到导航栏，正文 JS 渲染 |
| `platform.claude.com/docs` | 302 到 `anthropic.com` 后 fetch failed（不跟随跨域） |
| 站内搜「XX 汉化补丁」 | 开源软件多为官方内建多语言，去仓库 `Translations/zh_CN.po` |
| The Spriters Resource 任意直链 | 全站 Cloudflare 403 |

## 注意

- Bing 网页搜索忽略 `site:` 和引号，但**图片搜索可用**，图链在 `<a m="…">` 的 `murl` 里。
- 「某症状在哪版修的」先读仓库根 `CHANGELOG.md`，比翻 issue 快。

证据：2026-10-27 Pixelorama / Castlevania 贴图扒取，多轮后才走通