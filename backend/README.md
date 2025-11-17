# Lingo Link 后端服务（Gin + GORM）

## 1. 配置说明
- 默认读取 `backend/local.yaml`，其中的 `Mysql` 块会自动组装为 `mysql` DSN，只要填写 `Path/Port/Dbname/Username/Password` 即可。
- 如果还希望覆盖 DSN 或换用 SQLite，可在 `local.yaml` 中直接填 `DB.Driver` + `DB.DSN`，服务会优先使用显式的 `DB` 配置。
- 其他依赖项：Go 1.21+、MySQL 8.0+、环境变量 `JWT_SECRET`、`RELAY_API_KEY`（若使用上游模型）等。

## 2. 使用指定数据库记录登录用户
1. 在 MySQL 中预先执行 `backend/sql/schema.sql`：
   ```bash
   mysql -u root -p < backend/sql/schema.sql
   ```
   ➜ 该脚本会创建 `click-translate` 数据库（若不存在）并建好 `users`/`refresh_tokens`/`usage_logs` 表，结构与 GORM `model` 定义一致。
2. 确保 `backend/local.yaml` 中的 `Mysql` 内容对应本地 MySQL 实例，`Dbname` 需设为上述数据库名称。
3. 按需设置：
   ```bash
   export JWT_SECRET="<随机 32+ 字符>"
   export RELAY_API_KEY="<正式转发 Key>"
   ```

## 3. 启动后端
```bash
cd backend
go run ./cmd/server
```
服务会自动使用 `local.yaml` 中的 `Mysql` 信息连接 `click-translate`，并通过 GORM `AutoMigrate` 保持表结构（不过建议优先运行 schema 脚本来保证字段/索引）。
