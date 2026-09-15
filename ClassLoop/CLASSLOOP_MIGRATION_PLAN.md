# ClassLoop 迁移与最小落地方案

> 状态：STEP 1～STEP 3 已完成；尚未进入 ClassLoop 大规模开发  
> 核验日期：2026-08-31  
> PollUP 基线：`JonasWeinert/PollUP`，提交 `f20a147`  
> 参考仓库：`ClassLoop/PollUP`  
> 外部 AI 服务：`venture_agent`（全程只读，Git 工作区未发生修改）

## 1. 边界与本轮结论

ClassLoop 应保持三个清晰边界：

```text
ClassLoop Frontend（复用 PollUP UI）
        │ REST / WebSocket
        ▼
ClassLoop FastAPI（业务数据、统计、课堂知识图谱）
        │ HTTP，仅通过 Adapter
        ▼
VentureAgent（独立服务，不修改、不 import、不复制源码）
```

本轮只完成了只读核验、官方 PollUP 原版运行验证和迁移设计。没有修改 `venture_agent`，没有把 VentureAgent 的创业项目模型复制到 ClassLoop，也没有开始一次性移除 Convex。

核心判断：

- PollUP 的课堂会话、匿名参与、题目编辑、二维码、计时器、实时结果和响应式布局非常适合作为 ClassLoop 前端底座。
- PollUP 的页面数据获取与 Convex 强耦合，但耦合集中且可识别，适合逐页通过 data hooks/service provider 替换，不需要重写 UI。
- VentureAgent 当前可直接复用的稳定入口是 `/health` 和 `/api/chat`；Learning Tutor 能返回 reasoning trace/graph，但其系统提示仍是“创新创业辅导”，ClassLoop 必须在自己的 Adapter 中注入课堂上下文并规范化输出。
- VentureAgent 的 `/api/projects/import` 虽能解析 PDF/DOCX，但它绑定 VentureAgent 的 `project_id`、`project_files` 和上传目录；省略 `project_id` 时函数没有成功返回路径，因此不能直接视为 ClassLoop 通用文档解析 API。

## 2. STEP 1：VentureAgent 真实能力核验

### 2.1 启动、端口和 CORS

| 项目 | 源码核验结果 | ClassLoop 使用结论 |
|---|---|---|
| FastAPI 应用 | `backend/app/main.py` 中的 `app.main:app` | 作为独立外部服务运行 |
| 推荐启动脚本 | `start_backend.sh` 执行 `python -m uvicorn app.main:app` | 不修改脚本 |
| 默认监听地址 | `0.0.0.0` | 保持原配置 |
| 默认端口 | `8140`，可由原项目自己的 `BACKEND_PORT` 环境变量覆盖 | ClassLoop 默认调用 `http://localhost:8140`，不替 VentureAgent 改端口 |
| 直接运行 `main.py` | 源码尾部另有 `uvicorn.run(..., port=8000)` | 不作为 ClassLoop 的默认约定，优先遵循项目启动脚本的 8140 |
| CORS | `allow_origins=["*"]` | 开发期可跨端口；生产期风险由 VentureAgent 项目自行治理，ClassLoop 不修改它 |
| 健康检查 | `GET /health` → `{"status":"ok"}` | Adapter 启动检查可调用 |

### 2.2 `/api/chat`：可用于 Learning Tutor

实际接口：

```http
POST http://localhost:8140/api/chat
Content-Type: application/json
```

实际请求 Schema：

```json
{
  "message": "string，必填",
  "session_id": "string，可选，默认 default_session_123",
  "project_id": "integer，可选",
  "agent": "learning_tutor | project_coach，可选"
}
```

实际响应 Schema：

```json
{
  "reply": "string",
  "agent": "string",
  "message_id": 123,
  "reasoning_trace": "string | null",
  "reasoning_graph": {
    "nodes": [],
    "edges": []
  }
}
```

ClassLoop 的调用约定：

- 强制传 `agent: "learning_tutor"`，避免 Router 将课堂问题路由到 `project_coach`。
- 使用隔离的会话标识，例如 `classloop:{class_session_id}:{student_id}`。
- 第一版不传 VentureAgent `project_id`，避免触发其创业项目教师干预和项目数据模型。
- `message` 不是学生裸问题，而是由 ClassLoop Adapter 组装的课程上下文。
- Adapter 对 `reply`、`reasoning_trace`、`reasoning_graph` 做超时、空值、结构校验和降级处理。

建议的 Adapter 输入：

```json
{
  "course": "数据结构",
  "lesson": "Lesson 05",
  "class_session_id": "...",
  "knowledge_point": "AVL 树高与查找复杂度",
  "teacher_terms": ["平衡因子", "树高"],
  "current_slide": "...",
  "student_question": "为什么 AVL 查找复杂度是 O(log n)？",
  "strategy": "hint | counterexample | full_explanation"
}
```

Adapter 转换后的 `message` 应显式说明这是“数据结构课堂”，并要求围绕当前知识点回答。需要注意：现有 Learning Tutor 的系统提示和六段输出格式仍围绕创新创业教学，因此本轮只认定它“接口可复用”，不认定它已经天然适配数据结构课程。实际效果必须在 STEP 4 做一次真实回归。

### 2.3 文档解析 API 的真实限制

实际接口：

```http
POST /api/projects/import
Content-Type: multipart/form-data

file: PDF 或 DOCX，必填
project_id: integer，可选（但实际成功返回依赖它）
```

源码行为：

- PDF 使用 `pypdf` 提取文本；DOCX 使用 `python-docx` 提取段落。
- 文件会先写入 VentureAgent 自己的上传目录。
- 只有 `project_id is not None` 时才写 `project_files` 并返回 `status/text/filename/file_id/file_url`。
- 未传 `project_id` 时，当前函数执行到末尾没有正常成功响应体。

迁移决定：

- STEP 4 不调用此接口。
- ClassLoop 不能为了复用它而创建假的 VentureAgent Project，也不能修改 VentureAgent。
- 后续若必须复用，应先由 VentureAgent 项目自身提供独立、无 Project 依赖的公共解析 API；否则 ClassLoop 在自身后端实现课程文档解析。

### 2.4 Neo4j、Reasoning 和会话

- VentureAgent 通过 Python Neo4j Driver 连接 `NEO4J_URI`（默认 `bolt://localhost:7687`），不是供 ClassLoop 调用的通用 REST 知识图谱服务。
- `/api/neo4j-browser/*` 是 Neo4j Browser 代理/展示路由，不是 ClassLoop 业务图谱 API。
- `/api/chat` 会把消息保存到 VentureAgent 自己的 SQLite 会话表，并可能把 reasoning graph 同步到 VentureAgent 自己的 Neo4j 模型。
- ClassLoop 只消费 `/api/chat` 返回的 reasoning trace/graph；自己的课堂知识图谱必须使用独立 database 或独立 Label/namespace。
- ClassLoop 的正确率、人数、百分比、初复测差值必须由普通程序基于 ClassLoop SQLite 计算，不能交给 LLM。

## 3. STEP 2：PollUP 原版结构与运行核验

### 3.1 原版运行结果

在 `ClassLoop/PollUP` 完成了以下核验：

1. `npm ci --cache .npm-cache` 成功，安装 462 个包。
2. 首次 `npm run build` 因缺少 `convex/_generated` 失败，符合官方 README 所述初始化前状态。
3. 使用 Convex CLI 的“Start without an account”本地模式初始化成功；Schema 校验通过并生成 `_generated` 类型。
4. 再次 `npm run build` 成功，Vite 共转换 165 个模块并输出 `dist/`。
5. 短暂启动本地 Convex、Vite 后，以下地址均返回 HTTP 200：
   - `/`
   - `/input?session=123456`
   - `/output?session=123456`
   - 本地 Convex Dashboard
6. 验收完成后已停止临时 Vite 和 Convex 进程。

非阻塞性风险：

- `npm audit` 报告 19 个依赖漏洞（2 low、2 moderate、12 high、3 critical），目前未自动执行可能引入破坏性升级的 `npm audit fix --force`。
- Tailwind 配置仍使用旧的 `purge/content` 兼容写法，构建有警告。
- Browserslist 数据过旧，构建有提示。
- 当前提交的 README 声称 MIT，但仓库树中没有 `LICENSE` 文件。正式迁入和分发前应从上游取得可核验的许可证文本并保留作者归属；不能凭 README 声明自行伪造版权文本。

### 3.2 页面与组件树

```text
src/main.tsx
└─ ConvexReactClient + ConvexAuthProvider
   └─ App.tsx
      ├─ /                    → Authenticated/Unauthenticated
      │  ├─ SignInForm
      │  └─ Dashboard
      │     ├─ SessionCard
      │     ├─ SessionDetail
      │     │  ├─ SortableElementList
      │     │  │  └─ ElementCard
      │     │  ├─ CreateElementModal
      │     │  ├─ EditElementModal
      │     │  ├─ ConditionalLogicModal
      │     │  └─ TimerConfigModal
      │     ├─ CreateSessionModal
      │     └─ EditSessionModal
      ├─ /input               → ParticipantView
      ├─ /output              → ResultsView
      ├─ /timer               → TimerView
      ├─ /privacy             → PrivacyPolicy
      └─ /terms               → TermsOfUse
```

路由由 `App.tsx` 直接读取 `window.location.pathname`，当前未使用 React Router。

### 3.3 现有数据模型

PollUP 的 Convex Schema 只有三组业务表，外加 Convex Auth 表：

| PollUP 表 | 关键字段 | ClassLoop 初始映射 |
|---|---|---|
| `sessions` | teacherId、isActive、6 位 sessionCode、结果公开/PIN、完成页、颜色 | `ClassSession` |
| `elements` | sessionId、题型、题干/图片、顺序、choices/isCorrect、数值范围、条件逻辑 | `MicroCheck` + `Question` |
| `responses` | sessionId、elementId、匿名 participantId、文本/数值/选项/文件 | `StudentResponse` / `LearningEvidence` |

实际题型为：

- `single_choice`
- `single_choice_unique`
- `multiple_choice`
- `text_input`
- `number_input`
- `file_upload`

官方代码没有独立的 `true_false` 类型。ClassLoop 第一版可把判断题表示为只有“正确/错误”两个选项的 `single_choice`，无需新增一套渲染器。

### 3.4 数据流

#### Session 数据流

```text
Teacher 登录
→ Dashboard: getTeacherSessions
→ Create/Update/Clone/Toggle/Delete session mutation
→ SessionDetail
→ 生成学生 /input 和结果 /output 二维码
```

#### Poll/Element 数据流

```text
SessionDetail
→ getSessionElements reactive query
→ Create/Edit/Duplicate/Delete/Import/Reorder mutation
→ isActive + conditionalLogic 决定学生可见题目
```

#### Response 数据流

```text
ParticipantView
→ URL session code + localStorage anonymous participantId
→ 查询 session、可见 elements、已有 responses
→ submitResponse / file upload mutation
→ Convex responses 表
```

#### Realtime 数据流

```text
Convex mutation 写入
→ Convex reactive query 自动推送
→ ParticipantView / ResultsView / Dashboard 自动重渲染
→ ResultsView 在浏览器端计算选项计数、百分比和参与人数
```

实时不是独立组件，而是 `useQuery` 隐式提供。替换 Convex 时必须同时替换订阅语义，不能只把 mutation 改成 REST。

### 3.5 Convex 耦合清单

静态扫描结果：

- 16 个前端文件直接引用 Convex、Convex Auth 或 `_generated` 类型。
- 14 处 `useQuery(...)`。
- 21 处 `useMutation(...)`。
- 耦合最重的是 `ParticipantView.tsx` 和 `ResultsView.tsx`，两者合计约 1,579 行，同时包含数据获取、实时订阅、业务计算与 UI。

直接耦合文件：

```text
src/main.tsx
src/App.tsx
src/SignInForm.tsx
src/SignOutButton.tsx
src/components/ConditionalLogicModal.tsx
src/components/CreateElementModal.tsx
src/components/CreateSessionModal.tsx
src/components/Dashboard.tsx
src/components/EditElementModal.tsx
src/components/EditSessionModal.tsx
src/components/ElementCard.tsx
src/components/ParticipantView.tsx
src/components/ResultsView.tsx
src/components/SessionCard.tsx
src/components/SessionDetail.tsx
src/components/SortableElementList.tsx
```

## 4. STEP 3：组件迁移矩阵

分类含义：

- **保留**：结构和交互可直接使用，只做品牌、文字或接口注入。
- **轻改**：保留 JSX/Tailwind/交互，抽掉 Convex hooks 并增加 ClassLoop 字段。
- **重写**：原实现属于 Convex/法律内容/业务数据层，不应继续沿用。

| PollUP 原文件/模块 | ClassLoop 对应功能 | 处理 | Convex 替换点 | VentureAgent 调用点 |
|---|---|---:|---|---|
| `App.tsx` | ClassLoop 顶层路由与角色入口 | 轻改 | 替换 Authenticated/Unauthenticated；后续接 ClassLoop AuthProvider | 无 |
| `main.tsx` | 前端启动与全局 Provider | 重写 Provider 部分 | 移除 ConvexReactClient/ConvexAuthProvider，接 ClassLoop DataProvider | 无 |
| `SignInForm.tsx` | 教师登录 | 重写数据逻辑，保留表单样式 | Convex Auth → ClassLoop FastAPI auth | 无 |
| `SignOutButton.tsx` | 教师退出 | 重写数据逻辑 | Convex Auth → ClassLoop auth service | 无 |
| `Dashboard.tsx` | 教师课程/课堂列表 | 轻改 | `getTeacherSessions` → session service | 无 |
| `SessionCard.tsx` | Class Session 卡片 | 轻改 | 激活/删除/复制 mutation → session service | 无 |
| `CreateSessionModal.tsx` | 新建 Class Session | 轻改 | create/upload mutation → session/file service | 无 |
| `EditSessionModal.tsx` | 编辑 Class Session | 轻改 | update/upload mutation → session/file service | 无 |
| `SessionDetail.tsx` | 课堂与 Micro Check 编排 | 轻改 | element query/import mutation → micro-check service | 仅未来“生成复测题”由独立操作触发 |
| `SortableElementList.tsx` | Micro Check 排序 | 轻改 | move mutation → micro-check service | 无 |
| `ElementCard.tsx` | Micro Check 卡片 | 轻改 | delete/duplicate mutation → micro-check service | 无 |
| `CreateElementModal.tsx` | 创建 Micro Check | 轻改 | create/upload mutation → micro-check service | 可选：教师点击“生成变式题”时经后端调用 Tutor |
| `EditElementModal.tsx` | 编辑 Micro Check | 轻改 | update/upload mutation → micro-check service | 同上 |
| `ConditionalLogicModal.tsx` | 条件呈现/题目分支 | 保留交互、轻改数据 | updateConditionalLogic → micro-check service | 无 |
| `ParticipantView.tsx` | 学生作答、Recheck、AI Tutor Panel 容器 | 重点轻改 | session/elements/responses 查询和提交全部经 hooks/service；保留题型渲染 | 学生提示、反例、完整解释、主动提问 |
| `ResultsView.tsx` | Live Response + Misconception Analysis | 重点轻改 | 6 组 query + 删除 mutation → results/realtime service | 误区语义归并、教学干预建议；统计仍由程序计算 |
| `TimerConfigModal.tsx` | 教师计时器配置 | 保留 | 无 Convex | 无 |
| `TimerView.tsx` | 课堂计时器 | 保留 | 无 Convex | 无 |
| `Footer.tsx` | ClassLoop 页脚/归属信息 | 轻改 | 无 | 无 |
| `PrivacyPolicy.tsx` | ClassLoop 隐私说明 | 重写内容 | 删除 Convex 特定描述 | 无 |
| `TermsOfUse.tsx` | ClassLoop 使用条款 | 重写内容 | 删除 PollUP 产品条款 | 无 |
| `convex/schema.ts` | 迁移期旧模型参考 | 最终替换 | SQLAlchemy/SQLite schema | 无 |
| `convex/sessions.ts` | Session 业务规则参考 | 最终替换 | FastAPI session repository + WebSocket 事件 | 无 |
| `convex/elements.ts` | Micro Check 规则参考 | 最终替换 | FastAPI micro-check repository | 无 |
| `convex/responses.ts` | Response 规则参考 | 最终替换 | FastAPI response repository + WebSocket 广播 | 无 |
| `convex/auth*` | 原教师鉴权 | 最终替换 | ClassLoop 自有鉴权 | 无 |

### 4.1 ClassLoop 新增组件

| 新组件 | 插入位置 | MVP 职责 |
|---|---|---|
| `LessonContextBar` | `ParticipantView` 顶部 | 显示课程、课次、章节、当前知识点 |
| `AITutorPanel` | `ParticipantView` 题目区旁/下方 | 提示、例子、解释、提问；请求只发 ClassLoop 后端 |
| `MisconceptionPanel` | `ResultsView` 实时统计旁 | 显示误区、影响人数、答题/提问证据、关联知识点和干预操作 |
| `InterventionResult` | `ResultsView` | 显示初测、复测、修复增益；数值由普通程序计算 |
| `RecheckBadge/Section` | `ParticipantView` 与教师题目列表 | 标识变式复测及其来源误区 |

## 5. 可复用比例与替换成本

### 5.1 可复用比例

按“页面结构、Tailwind 样式、题型交互、计时器、二维码和结果展示”估算：

- **可原样或近原样保留：约 15%–20%**，主要是 Timer、部分通用展示和基础样式。
- **保留 UI、轻改数据/业务：约 55%–60%**，主要是 Session、Element、Participant、Results 相关组件。
- **必须重写：约 20%–30%**，主要是 Provider、Auth、Convex 数据层和法律文本。
- **前端视觉与交互综合复用率：约 70%–80%**。
- **整个应用代码的复用率会更低**，因为 ClassLoop FastAPI、SQLite、课堂知识图谱、误区/干预/复测模型均为新业务层。

这不是按文件数机械计算，而是基于源码耦合和组件体量的工程估算。`ParticipantView`、`ResultsView` 虽然很大，但大部分 JSX 和题型展示可以保留；应拆数据边界，不应推翻页面。

### 5.2 Convex 替换成本

复杂度评估：**中高**。

原因：

1. 16 个前端文件直接依赖 Convex。
2. 21 个 mutation 覆盖 Session、题目、排序、文件、回答和结果清理。
3. 14 个 query 中有多组依赖实时推送，特别集中在学生端和结果端。
4. Auth、Storage、Database、Reactive Query 是一起提供的，替换不是单一 REST 接口改名。
5. 匿名 participantId、唯一选项占用、条件逻辑、文件元数据和结果 PIN 都要保持行为一致。

降低风险的关键：先建立可替换的数据契约，再按 Session → Element → Response → Realtime → Auth 的顺序迁移，每替换一组就做双端回归。

## 6. 数据访问层与 realtimeService 设计

目标目录在正式迁入后的 `ClassLoop/frontend/src`：

```text
src/
├─ services/
│  ├─ contracts.ts
│  ├─ classloopApi.ts
│  ├─ realtimeService.ts
│  └─ ventureAgentApi.ts
├─ data/
│  ├─ DataProvider.tsx
│  ├─ convex/          # 迁移期实现，最终删除
│  └─ classloop/       # REST + WebSocket 实现
└─ hooks/
   ├─ useClassSessions.ts
   ├─ useMicroChecks.ts
   ├─ useStudentResponses.ts
   └─ useLiveResults.ts
```

注意：Convex 的 `useQuery/useMutation` 本身是 React Hooks，不能简单塞进普通 service 函数。迁移期应由 `DataProvider + hooks` 封装 Convex hooks，普通 HTTP、WebSocket 与 DTO 归入 `services`。页面只依赖统一 hooks/contract，不直接 import Convex 或 FastAPI SDK。

`realtimeService` 最小契约：

```ts
interface RealtimeService {
  subscribeSession(sessionId: string, onEvent: (event: SessionEvent) => void): Unsubscribe;
  subscribeMicroChecks(sessionId: string, onEvent: (event: MicroCheckEvent) => void): Unsubscribe;
  subscribeResponses(sessionId: string, onEvent: (event: ResponseEvent) => void): Unsubscribe;
}
```

后续 FastAPI WebSocket 只替换实现，不改变 `ParticipantView` 和 `ResultsView` 的 JSX。

## 7. ClassLoop 后端与 Adapter 计划

确认继续 STEP 4 后，建立：

```text
ClassLoop/
├─ frontend/                 # 从参考 PollUP 迁入的正式前端
├─ backend/
│  └─ app/
│     ├─ main.py
│     ├─ api/
│     │  ├─ health.py
│     │  └─ agent.py
│     ├─ schemas/
│     │  └─ tutor.py
│     ├─ services/
│     │  └─ tutor_service.py
│     └─ adapters/
│        └─ venture_agent_adapter.py
├─ PollUP/                   # 只作为上游参考仓库
└─ CLASSLOOP_MIGRATION_PLAN.md
```

Adapter 是 ClassLoop 调用 VentureAgent 的唯一主要耦合点：

```text
POST /api/agent/tutor-test
→ TutorRequest Schema 校验
→ TutorService 组装课堂上下文
→ VentureAgentAdapter POST http://localhost:8140/api/chat
→ 固定 agent=learning_tutor
→ 超时/HTTP 错误/无效图结构处理
→ 规范化为 ClassLoop TutorResponse
```

建议 ClassLoop 的标准响应：

```json
{
  "answer": "...",
  "mode": "hint",
  "agent": "learning_tutor",
  "trace": "...",
  "graph": {"nodes": [], "edges": []},
  "degraded": false
}
```

前端不得直接访问 `localhost:8140`；它只调用 ClassLoop FastAPI。这样可避免泄露 VentureAgent 地址、在浏览器中处理超时/密钥、以及多个页面各自拼接提示词。

## 8. 建议第一批修改文件（待确认后执行）

第一批只建立最小调用链，不做数据库大迁移：

### 新增

```text
ClassLoop/backend/requirements.txt
ClassLoop/backend/.env.example
ClassLoop/backend/app/__init__.py
ClassLoop/backend/app/main.py
ClassLoop/backend/app/api/health.py
ClassLoop/backend/app/api/agent.py
ClassLoop/backend/app/schemas/tutor.py
ClassLoop/backend/app/services/tutor_service.py
ClassLoop/backend/app/adapters/venture_agent_adapter.py
ClassLoop/frontend/                         # 迁入 PollUP 受版本控制的前端资源
ClassLoop/frontend/src/services/contracts.ts
ClassLoop/frontend/src/services/classloopApi.ts
ClassLoop/frontend/src/services/ventureAgentApi.ts
```

### 仅做轻微配置修改

```text
ClassLoop/frontend/package.json             # 包名/脚本，不立即删 Convex
ClassLoop/frontend/vite.config.ts           # /api 代理到 ClassLoop:8100
ClassLoop/frontend/src/App.tsx              # 仅增加一个可见健康/Tutor 测试入口（如需要）
ClassLoop/frontend/.env.example
```

### 第一批明确不改

```text
venture_agent/**
PollUP 的 ParticipantView/ResultsView 主体
PollUP 的 Convex schema/functions
课堂 SQLite/Neo4j 正式模型
Misconception/Intervention/Recheck 全业务链
```

## 9. 最小可运行路线

### 里程碑 M0：已完成

```text
官方 PollUP + 无账号本地 Convex
→ 生产构建成功
→ Vite/Convex 启动成功
→ /、/input、/output 均 HTTP 200
```

### 里程碑 M1：下一步（STEP 4）

```text
PollUP UI 保持可运行
+ ClassLoop FastAPI :8100
+ GET /api/health
+ POST /api/agent/tutor-test
+ VentureAgentAdapter → VentureAgent :8140/api/chat
+ 返回 Learning Tutor reply/trace/graph
```

验收标准：

1. `venture_agent` Git 状态保持不变。
2. `GET http://localhost:8100/api/health` 返回 ClassLoop 状态。
3. 数据结构 AVL 示例请求能穿过 ClassLoop Adapter 到 `/api/chat`。
4. 返回值被规范化，VentureAgent 不可用时 ClassLoop 返回明确的 502/504 或降级响应。
5. PollUP 原 `/input`、`/output` 和 Timer 不回归。

### 里程碑 M2：逐步替换，不一次性推翻

```text
Session service
→ Micro Check service
→ Response service
→ realtimeService（FastAPI WebSocket）
→ ClassLoop Auth/Storage
→ 移除 Convex Provider 和 backend
```

### 里程碑 M3：课堂认知反馈闭环

```text
数据结构：树 / BST / AVL
→ 初测
→ 普通程序统计错误证据
→ LLM 语义归并候选误区
→ 教师确认并发起干预
→ Agent 生成解释/反例/变式题候选
→ 复测
→ 普通程序计算修复增益
```

## 10. 执行守则

- 永不修改或 import `venture_agent` 源码。
- 不把 VentureAgent Project、创业教学提示词或 Neo4j Schema复制到 ClassLoop。
- 不让前端直接调用 VentureAgent。
- 不把正确率、人数、初复测差值交给 LLM 计算。
- 不同时重写 UI、数据层和实时层。
- 每替换一个 Convex 模块都验证教师端、学生端和结果端。
- 在许可证文本得到上游核验前，不声称本地已完整保留一个实际不存在的 `LICENSE` 文件。
- MVP 只围绕数据结构“树 / BST / AVL”的一次初测—干预—复测闭环。

