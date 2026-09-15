# ClassLoop Backend

FastAPI + SQLite backend for the ClassLoop MVP.

## Run

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8100
```

- API docs: http://127.0.0.1:8100/docs
- Health: http://127.0.0.1:8100/api/health
- SQLite database: `data/classloop.db`
- Demo teacher: `teacher@classloop.local` / `classloop123`
- Read-only admin: `admin@classloop.local` / `classloop-admin`

Teacher emails are case-insensitively unique. Student avatar/name combinations are held only in the backend's in-memory live roster and are removed on leave or after 10 minutes without a heartbeat.

Classroom events are delivered through Server-Sent Events at `/api/public/sessions/{session_id}/events`. Teacher broadcasts are stored in SQLite and pushed to connected student and teacher pages immediately.

## PPTX/PDF 课件图谱

教师上传 `.pptx` 或 `.pdf` 后，ClassLoop 会在本地完成逐页文本提取、文本块切分和关键词识别，并生成以下图模型：

- 节点：`ClassLoopDocument`、`ClassLoopSession`、`ClassLoopPage`、`ClassLoopChunk`、`ClassLoopKeyword`
- 关系：`USES_DOCUMENT`、`HAS_PAGE`、`NEXT_PAGE`、`HAS_CHUNK`、`NEXT_CHUNK`、`MENTIONS`

提取结果和待同步图谱会先写入 SQLite。未配置 Neo4j 时为 `pending`；已配置但连接/同步失败时为 `failed`。提取内容仍保留，恢复连接后可调用重试接口同步。

主要接口：

- `POST /api/documents/ingest`：上传并提取课件，可选绑定 `session_id`
- `GET /api/documents`：查询当前教师的课件
- `GET /api/documents/{id}`：查看逐页提取结果
- `GET /api/documents/{id}/graph`：查看待写入图数据库的节点和关系
- `POST /api/documents/{id}/sync-graph`：重试 Neo4j 同步
- `DELETE /api/documents/{id}`：删除课件及其图谱节点
- `GET /api/graph/status`：检查 ClassLoop Neo4j 连接
- `GET /api/admin/graph/status`：管理员查看 Neo4j 连接状态
- `GET /api/admin/documents`：管理员只读查看全部教师课件
- `GET /api/admin/documents/{id}/graph`：从 Neo4j 直接读取课件节点和关系

本机可以使用独立端口启动 ClassLoop 专用 Neo4j，避免与 VentureAgent 冲突：

```powershell
cd backend
Copy-Item .env.example .env
docker compose -f docker-compose.neo4j.yml up -d
```

- Neo4j Browser：http://127.0.0.1:7475
- Bolt：`bolt://127.0.0.1:7688`
- 默认本地账号：`neo4j` / `classloop-graph`（正式使用前请在 `.env` 修改）
