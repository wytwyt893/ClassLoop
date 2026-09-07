# ClassLoop Frontend

ClassLoop 的 React + Vite 教师端与学生端。当前版本已连接 ClassLoop FastAPI API，账号、课堂、题目、作答与上传文件持久化到本机 SQLite。

## 启动完整项目

终端一（后端）：

```powershell
cd ..\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8100
```

终端二（前端）：

```powershell
cd ..\frontend
npm install
npm run dev
```

- 前端：http://127.0.0.1:5173
- API 文档：http://127.0.0.1:8100/docs
- SQLite：`../backend/data/classloop.db`

默认演示账号：

- 邮箱：`teacher@classloop.local`
- 密码：`classloop123`
- 演示课堂码：`240805`

前端 API 地址可在 `.env` 中通过 `VITE_API_BASE_URL` 修改，示例见 `.env.example`。

## 实时数据更新

课堂、题目和回答通过 HTTP API 读写；课堂状态变化通过 SSE 即时推送。学生提交回答后教师结果页会立即刷新，教师也可向学生端实时广播课堂提示。SSE 断线时保留 10 秒轮询兜底。AI 误区分析服务尚未接入。

## 上游归属

本前端保留并改造了 Jonas Weinert 的 PollUP 页面结构、组件和 Tailwind 样式。参考仓库：<https://github.com/JonasWeinert/PollUP>。

当前上游提交的 README 声明 MIT，但所检出的仓库树中没有 LICENSE 文件；正式分发前需补充经上游核验的许可证文本与版权归属。
