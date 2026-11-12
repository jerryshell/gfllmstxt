# AI 开发约定

本页汇总使用 AI 生成 GoFrame 代码时需要遵守的项目约定。约定来自 GoFrame Skills 技能定义与框架文档，适用于 GoFrame v2 项目。

仅在目标项目使用 GoFrame v2 时适用：`go.mod` 依赖 `github.com/gogf/gf/v2`，或代码导入了该模块及其子包。

## 项目与代码组织

- 完整项目使用 `gf init` 创建脚手架，命令见[项目创建](../docs/cli/init.md)。
- `dao`、`do`、`entity` 由生成工具维护，不手工创建或修改。生成命令见[数据规范-gen dao](../docs/cli/gen-dao.md)。
- 业务逻辑直接放在 `service` 目录。除非明确要求，不新增 `logic` 目录。
- 新增方法或变量前先检索现有实现，优先复用。

## 错误处理

所有可能出错的调用都要显式处理，并使用 `gerror` 包装，保留完整堆栈。

```go
if err != nil {
	return gerror.Wrap(err, "创建用户失败")
}
```

## 数据库操作

- 写操作使用 DO 对象，位于 `internal/model/do`。不使用 `g.Map` 或 `map[string]any` 构造更新数据。
- DO 字段类型为 `interface{}`，未赋值字段保持 `nil`，ORM 会自动忽略。
- 需要显式写入 `NULL` 时使用 `gdb.Raw("NULL")`。

```go
data := do.User{}
if password != "" {
	data.PasswordHash = hash
}
if isAdmin != nil {
	data.IsAdmin = *isAdmin
}
dao.Users.Ctx(ctx).Where(cols.Id, id).Data(data).Update()
```

```go
dao.Instances.Ctx(ctx).Where(cols.Id, id).Data(do.Instance{IdleSince: gdb.Raw("NULL")}).Update()
```

## 时间字段与软删除

表包含 `created_at`、`updated_at`、`deleted_at` 时，ORM 自动维护对应字段并自动过滤软删除数据。

- 不手工设置 `created_at` 与 `updated_at`。
- 不手工追加 `deleted_at IS NULL` 查询条件。
- 删除使用 `Delete()`，框架会转换为软删除更新。

```go
dao.User.Ctx(ctx).Where(do.User{Id: id}).Delete()
```

时间字段名称与行为可以通过配置调整，见[时间维护](../docs/core/gdb-chaining-soft-time.md)。

## 变量声明

同一作用域内三个及以上相关变量使用 `var` 块，便于对齐和阅读。

```go
var (
	authSvc       *auth.Service
	bizCtxSvc     *bizctx.Service
	middlewareSvc *middleware.Service
)
```

## 测试

测试使用 `test/gtest`，采用 `gtest.C` 与断言方法，保持与框架其他测试一致。

```go
func TestUserCreate(t *testing.T) {
	gtest.C(t, func(t *gtest.T) {
		user, err := service.User.Create(ctx, input)
		t.AssertNil(err)
		t.AssertGT(user.Id, 0)
	})
}
```

## 相关页面

- [GoFrame Skills 安装与使用](../ai/goframe-skills.md)
- [HTTP 项目示例](../examples/practices/user-http-service.md)
- [gRPC 项目示例](../examples/practices/user-grpc-service.md)
- [工程目录设计](../docs/design/project-structure.md)
- [代码分层设计](../docs/design/project-layer.md)
