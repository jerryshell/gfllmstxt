# 框架概览

GoFrame 是 Go 语言的模块化应用开发框架，模块路径为 `github.com/gogf/gf/v2`，当前版本 2.10.4，采用 MIT 许可。框架既可以作为完整项目框架使用，也可以只引入需要的组件。

## 运行要求

- Go 1.23 及以上
- Linux、macOS、Windows
- 官方 CI 覆盖 amd64 与 386 架构

## 安装

在已有 Go 模块中添加框架：

```bash
go get -u github.com/gogf/gf/v2
```

安装 `gf` 命令行工具：

```bash
go install github.com/gogf/gf/cmd/gf/v2@latest
```

命令行工具提供项目创建、代码生成、编译运行、资源打包等能力，安装与其他命令见[工具安装](../docs/cli/install.md)。

## 最小 HTTP 服务

```go
package main

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/net/ghttp"
)

func main() {
	s := g.Server()
	s.BindHandler("/", func(r *ghttp.Request) {
		r.Response.Write("Hello World!")
	})
	s.SetPort(8000)
	s.Run()
}
```

将代码保存为 `main.go`，执行 `go mod tidy` 与 `go run main.go`，然后访问 `http://127.0.0.1:8000`。

使用命令行工具创建完整项目脚手架：

```bash
gf init hello
cd hello && gf run main.go
```

## 阅读建议

- 首次使用：从[下载与使用](../quick/install.md)开始，按基础教程顺序阅读
- 了解模块划分：阅读[源码结构](source-map.md)
- 使用 AI 生成代码：先读 [AI 开发约定](ai-conventions.md)
- 按组件查找页面：查看[完整索引](../llms.txt)

本项目的文档按官方文档的章节组织，代码示例与接口说明均来自对应页面。框架设计、组件用法和常见问题集中在 `docs` 目录，示例项目集中在 `examples` 目录。

## 许可与来源

框架代码采用 MIT 许可。文档内容来自 GoFrame 官方文档仓库 `gogf/gf-site`，版权归 GoFrame 项目所有。来源与构建方式见项目根目录的 `README.md`。
