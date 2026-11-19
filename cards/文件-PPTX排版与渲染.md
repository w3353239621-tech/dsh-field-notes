# 文件-PPTX排版与渲染

> **触发**：用 python-pptx 做幻灯片/改模板/加装饰图，再渲染预览，出现文字溢出或被裁、图变形、白底块、页序错乱、渲染序号对不上
> **锚点**：`python-pptx`、`MSO_AUTO_SIZE`、`add_picture`、`svgBlip`、`alphaModFix`、`libreoffice-kit`、`--output-dir`、`p:cNvPr`、`_sldIdLst`、`keep`
> **验证**：渲染出的 PNG 上文字在框内、装饰图不露白边、页序与大纲一致

## 首选

```python
from PIL import Image, ImageFont
ImageFont.truetype("C:/Windows/Fonts/simsun.ttc", size)    # 量宽：汉字≈1em 全宽
box.auto_size = MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT            # 多行；单行用 TEXT_TO_FIT_SHAPE
w, h = Image.open(png).size                                # 只给一边必变形，按比例补另一边
```

渲染：一次只点一页 `--pages N`，每次换新的 `--output-dir`。

## 别再来

| 弯路 | 为什么不通 |
| --- | --- |
| 靠眼睛估文字放不放得下 | 折行数差一行就溢出，必须先按框宽算 |
| `add_picture` 只传 w 或只传 h | 缺的一边按像素当 EMU，图横向拉宽几倍 |
| 复用 `--output-dir` | 目录已存在 → `EEXIST`，渲染直接失败 |
| `--pages 5,7,8` 后按 page-0001 认页 | 多页输出的 page-NNNN 与列表**不同序**；逐页点名 |
| 在母版/版式里找装饰 | 示例模板装饰是**幻灯片上的图片对象**：`slide.shapes[k].image.blob` |
| 透明 PNG 直接当背景 | 浅底露白块、深底成硬块；包 SVG（`asvg:svgBlip`+PNG 兜底）或 `a:alphaModFix amt≈30000` |
| 把 `hidden="1"` 打在 `p:sp` | 整块文字连内容一起消失；要打在 `p:cNvPr` |
| 删页后按 slideN.xml 编号比对 | 编号≠呈现顺序，重编 PNG 字节也会变；按内容 md5 比 |
| 以为 `keep={…}` 会重排 | 只删不排；要按大纲排得清空 `_sldIdLst` 再 append（记得 `drop_rel`） |

## 注意

- 深底 token 迁浅底要整组重定（墨 #242220/#44413D/#6E6962/#948E85，朱红 #A2352C 可留）；浅底上的白底水墨图要压 `a:lum` 提黑再调 `a:alphaModFix`。
- 改模板前**先渲染原页确认是浅底还是深底**，否则整套配色判断都会反。

证据：`procedures/_inbox.md` 2026-10-30～10-31 PPTX 条目；`_ppt_build/`
