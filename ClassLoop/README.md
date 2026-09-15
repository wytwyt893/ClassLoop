# ClassLoop

新队友请先阅读：[项目交接与进度说明（2026-09-03）](./ClassLoop_项目交接与进度说明_2026-09-03.md)，包含三端功能矩阵、AI 进度、双数据库、启动排错及 9 月 7 日前目标。

ClassLoop 是一个面向课堂理论教学的认知反馈应用原型。本版本已经打通：

`三入口主页 → 教师注册/登录 → 创建课堂/题目 → 学生临时身份作答 → SSE 实时刷新与教师广播 → 教师查看结果 → 管理员统一查看 SQLite 与 Neo4j`

## 项目目录

- `frontend/`：React + Vite + Tailwind 教师端/学生端
- `backend/`：FastAPI + SQLite API
- `backend/data/classloop.db`：运行时自动创建的本机数据库
- `backend/docker-compose.neo4j.yml`：ClassLoop 专用 Neo4j，可选启动且与 VentureAgent 端口隔离
- `PollUP/`：只读外部参考仓库，不属于 ClassLoop 运行链路

## 启动

在 VS Code 中打开当前 `ClassLoop` 文件夹，然后开启两个终端。

终端一：

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8100
```

终端二：

```powershell
cd frontend
npm run dev
```

- 前端：http://127.0.0.1:5173
- API 文档：http://127.0.0.1:8100/docs
- 演示账号：`teacher@classloop.local` / `classloop123`
- 管理员：`admin@classloop.local` / `classloop-admin`
- 演示课堂码：`240805`

## 三个入口

- `/student`：课堂码 → 预设动物头像 → 临时用户名 → 作答；退出后身份立即清除
- `/teacher`：教师注册/登录与课堂工作台；邮箱在 SQLite 中唯一
- `/admin`：只读查看教师账号、课堂、题目和回答统计，不显示密码哈希

三个入口互不共享身份状态：首页不读取账号信息；教师端和管理员端分别使用独立的浏览器登录令牌，管理员登录不会覆盖教师登录，学生端不使用账号令牌。

管理员入口包含“关系数据库”和“Neo4j 知识图谱”两个一级标签。关系库页面查看教师、课堂、题目、回答、课件和临时在线统计；图谱页面直接读取 Neo4j，可按课件和页面查看文档、文本块及关键词关系。

课堂单选题采用学生独立作答模型，不会因为其他学生选择了同一选项而发生冲突。早期的 `single_choice_unique` 数据会在后端启动时自动迁移为普通单选题。

## 实时课堂闭环

- 学生加入、退出和提交回答后，后端通过课堂级 SSE 通道即时通知教师端刷新。
- 教师可在结果页向全班发送课堂提示，学生端即时弹出并保留最新一条提示。
- SSE 断线时浏览器自动重连，并保留 10 秒轮询作为数据补偿。
- 教师广播持久化在 SQLite 的 `classroom_events` 表；学生临时头像和用户名仍只保存在内存中。

当前误区分析仍为可解释规则演示。后续可在同一事件通道上增加 PPT 页码同步、逐页疑问反馈、AI 语义聚类和教学干预建议。

## 最终验收演示

从仓库根目录使用 `start_classloop.ps1 -Mode Full` 后，可访问 `/acceptance`。该独立页面不会修改原教师、学生和管理员流程，集中展示项目逻辑、F1/F2/F3随机抽测、V1→V2对比以及版本/run_id/日志证据。Agent异常会明确显示为失败或降级，不会伪装成真实模型成功。

## 课件知识图谱

后端现已支持教师上传 PPTX/PDF，并生成“课堂—文档—页面—文本块—关键词”节点及页面顺序、包含、提及关系。Neo4j 未配置时，完整图谱先保存在 SQLite 中等待同步；ClassLoop 不导入或修改 `venture_agent` 代码，也不会默认连接 VentureAgent 的 Neo4j。
