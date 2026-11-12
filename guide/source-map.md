# 源码结构

GoFrame 主仓库采用多模块结构。根模块提供核心框架，`cmd/gf` 与 `contrib` 下的每个目录都是独立 Go 模块，使用时按需引入，避免为单个功能引入过多依赖。

| 模块 | 导入路径 | 说明 |
| --- | --- | --- |
| 根模块 | `github.com/gogf/gf/v2` | 核心框架与基础组件 |
| 命令行工具 | `github.com/gogf/gf/cmd/gf/v2` | `gf` 命令 |
| 扩展模块 | `github.com/gogf/gf/contrib/*/v2` | 数据库驱动、注册中心、配置适配器、链路导出器等 |

## 顶层包

| 路径 | 职责 |
| --- | --- |
| `frame/g`、`frame/gins` | 单例入口与类型门面，提供 `g.Server()`、`g.DB()`、`g.Cfg()` 等访问方法 |
| `net/` | HTTP 服务、TCP 与 UDP、服务注册发现、负载均衡、链路跟踪、OpenAPI |
| `os/` | 配置、命令行、定时任务、日志、文件、缓存、Session 等系统能力 |
| `database/` | ORM 核心 `gdb` 与 Redis 客户端核心 `gredis` |
| `container/` | 并发安全数组、字典、集合、链表、队列与泛型类型 |
| `encoding/` | JSON、XML、YAML、TOML、INI 等编解码 |
| `text/` | 字符串处理 `gstr` 与正则表达式 `gregex` |
| `util/` | 类型转换 `gconv`、数据校验 `gvalid` 与常用工具 |
| `crypto/` | AES、DES、RSA、MD5、SHA、CRC32 |
| `errors/` | 带堆栈的错误对象与错误码 |
| `internal/` | 私有实现，不支持在根模块之外导入 |
| `test/gtest` | 框架测试辅助工具 |

## 扩展模块

`contrib` 下的模块独立发布，导入路径以 `/v2` 结尾。

| 分类 | 模块 |
| --- | --- |
| 配置 | `contrib/config/apollo`、`consul`、`kubecm`、`nacos`、`polaris` |
| 数据库驱动 | `contrib/drivers/clickhouse`、`dm`、`gaussdb`、`mariadb`、`mssql`、`mysql`、`oceanbase`、`oracle`、`pgsql`、`sqlite`、`sqlitecgo`、`tidb` |
| 指标 | `contrib/metric/otelmetric` |
| NoSQL | `contrib/nosql/redis` |
| 注册中心 | `contrib/registry/consul`、`etcd`、`file`、`nacos`、`polaris`、`zookeeper` |
| RPC | `contrib/rpc/grpcx` |
| SDK | `contrib/sdk/httpclient` |
| 链路导出 | `contrib/trace/otlpgrpc`、`otlphttp` |

数据库驱动与 Redis 适配器通过导入触发注册，核心包只定义接口。例如使用 MySQL 时同时导入驱动：

```go
import (
	"github.com/gogf/gf/contrib/drivers/mysql/v2"
	"github.com/gogf/gf/v2/frame/g"
)
```

## 关键约定

- `frame/g` 是门面，不是独立实现。框架内部代码通常直接导入底层包，业务代码可以使用 `g.*` 简化调用。
- `util/gconv` 是类型转换的基础。多数公开接口接收 `any` 并通过 `gconv` 完成转换，修改参数处理逻辑时需要同时检查转换行为。
- `internal/` 属于私有包，不应在根模块之外导入，也不应在导出签名中暴露其类型。
- 测试统一使用 `test/gtest` 的 `gtest.C` 写法与 `t.Assert*` 断言，不使用标准库 `testing` 直接编写断言。
- 工程分层与目录规范见[工程目录设计](../docs/design/project-structure.md)与[代码分层设计](../docs/design/project-layer.md)。

## 相关页面

- [框架概览](overview.md)
- [数据库 ORM](../docs/core/gdb.md)
- [开发工具](../docs/cli/install.md)
- [微服务开发](../docs/micro-service.md)
