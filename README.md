# GoFrame llms.txt

本仓库是 GoFrame 的自包含 `llms.txt` 文档集，面向大语言模型与代码助手。入口文件为 `llms.txt`，全部文档以 Markdown 形式保存在仓库内，不依赖外部站点即可读取。

文档对应 GoFrame v2 主线版本，正文为简体中文。版本与运行要求以 `guide/overview.md` 为准，不在其他文件重复。

## 目录结构

```text
.
├── README.md           # 项目说明
├── LICENSE             # MIT 许可证
├── index.html          # 站点入口页
├── _headers            # Cloudflare Pages 响应头
├── llms.txt            # 入口索引，按章节列出全部页面
├── llms-full.txt       # 全部页面合并后的单文件版本
├── guide/              # 项目自编写的说明页
├── docs/               # 官方文档正文
├── quick/              # 快速开始与项目脚手架教程
├── ai/                 # AI 辅助开发相关页面
├── examples/           # 示例项目说明
├── sources.json        # 构建清单，仅记录源目录、章节顺序与文案修订
└── scripts/build.mjs   # 生成脚本
```

`docs`、`quick`、`ai`、`examples` 下的页面由脚本从官方文档源生成。`guide` 下的页面为本项目编写，是版本、安装、源码结构与 AI 约定的唯一出处。

## 使用方式

1. 先读 `llms.txt`，按章节定位需要的页面。
2. 需要完整上下文时读取 `llms-full.txt`，该文件约 2.4 MB。
3. 只取单个主题时，直接读取对应 Markdown 文件。

索引中的文档链接全部为仓库内相对路径，外部资源单独列在文件末尾。生成时会校验每个本地链接，当前断链数量为 0。

## 构建

要求 Node.js 18 及以上，无第三方依赖。

```bash
node scripts/build.mjs
```

默认从项目上级目录的 `gf-site-65d6fdd` 读取文档源。源目录在其他位置时，使用参数或环境变量指定：

```bash
node scripts/build.mjs --site /path/to/gf-site
GF_SITE_SOURCE=/path/to/gf-site node scripts/build.mjs
```

构建会先清空 `docs`、`quick`、`ai`、`examples`，再重写这些目录与 `llms.txt`、`llms-full.txt` 及两个 XML 附件，并在结束时输出页面数量、索引大小、断链数量与校验结果。`guide` 目录不参与生成，手工维护。

## 来源与版本

| 来源 | 用途 |
| --- | --- |
| `gogf/gf-site` | 文档正文、示例说明、页面标题与章节结构 |
| `gogf/gf` v2 源码 | 版本号、Go 版本要求、模块与包结构，汇总在 `guide/overview.md` 与 `guide/source-map.md` |
| `gogf/skills` | `guide/ai-conventions.md` 中的开发约定 |

本项目自编写的内容中，版本与运行要求只在 `guide/overview.md` 中定义一次，其他页面引用时使用链接。镜像页面保留官方原文中的版本表述。

## 内容处理规则

生成脚本对源页面做以下处理，正文事实不做改写：

- 移除 Docusaurus 前置元数据、主题组件导入与 `DocCardList` 占位。
- 移除图片引用，图片不纳入本仓库。
- 将提示块转换为加粗标签段落。
- 将站内链接改写为仓库内相对路径，站外链接保持原样。
- 删除空标题与连续空行。
- 仅对正文做文字规范处理：去除 emoji，替换破折号与中文双引号，统一第二人称表述。代码块与行内代码保持原样。

源页面中的过期信息与可见术语按 `sources.json` 的 `rewrites` 修正，包括最低 Go 版本、示例页面的 GitHub 标注与 JavaScript 写法。

## 单一事实来源约定

- `docs`、`quick`、`ai`、`examples` 下的页面标题、正文与代码示例只来自官方文档源，不在本仓库重复维护。
- `sources.json` 只记录源目录、排除项、章节顺序、目录标题、附件与少量文案修订，不记录页面内容。
- 版本号、Go 版本要求、安装命令集中在 `guide/overview.md`。
- 模块与包结构集中在 `guide/source-map.md`。
- AI 代码约定集中在 `guide/ai-conventions.md`。
- 索引由目录结构与页面标题生成，不手工维护条目。

## 已知取舍

- 文档镜像保留官方章节结构，索引最多展开到四级标题，更深的目录合并到上一级列表。
- 没有正文的目录页会生成子页面链接，便于从任意页面继续导航。
- 源站的部分时效性内容未逐一校对，例如历史版本说明。框架版本与运行要求以 `guide/overview.md` 为准。
- 示例代码位于官方仓库与 `gogf/examples`，本仓库只收录示例说明页。

## 部署

站点地址：https://gfllmstxt.pages.dev

Cloudflare Pages 项目 `gfllmstxt` 采用直接上传方式发布，上传目录由以下静态文件组成：

- `index.html` 与 `_headers`
- `llms.txt`、`llms-full.txt`
- `guide`、`docs`、`quick`、`ai`、`examples`

发布命令：

```bash
rm -rf .deploy && mkdir -p .deploy
cp index.html _headers llms.txt llms-full.txt LICENSE .deploy/
cp -r docs quick ai examples guide .deploy/
CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<account-id>   npx wrangler pages deploy .deploy --project-name=gfllmstxt --branch=master
```

`.deploy` 是临时目录，已在 `.gitignore` 中忽略。`_headers` 为 `llms.txt`、`llms-full.txt` 与 Markdown 文件指定内容类型。

## 许可

本仓库采用 MIT 许可，许可证文本见 `LICENSE`。文档内容来自 `gogf/gf-site`，版权归 GoFrame 项目所有。框架代码同样采用 MIT 许可。`guide/ai-conventions.md` 参考的 GoFrame Skills 技能定义采用 Apache-2.0 许可。
