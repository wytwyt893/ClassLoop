# 大数据技术课程实践

本仓库以课程实践目录为唯一 Git 根，包含当前课堂产品 `ClassLoop/`、继续参与本轮开发但不再单独推送的 `venture_agent/`，以及可核查验收材料 `acceptance/`。

当前 Agent 版本：`classloop-agent-v2.2-evidence-rag`。

## 当前成果

- 学生端：临时身份进入课堂、回答 Micro Check、接收教师广播、针对当前课件页进行带 `[E1]` 引用的 AI 追问。
- 教师端：创建课堂与题目、上传和同步课件、查看实时反馈、运行 F4 `evidence_teaching_coach`，形成“误区—证据—干预—复测”闭环。
- 管理员端：只读查看 SQLite、Neo4j 课件图谱，以及 Agent 版本、run_id、引用数、运行模式、缓存和耗时。
- VentureAgent：保留 F1 理论学习、F2 项目指导、F3 项目评审，新增 F4 教学干预、轻量中文 RAG、引用门禁、明确降级和 10 分钟重复请求缓存。
- 工程证据：每次 Agent 请求保存独立 run_id 和原始 JSON；测试、版本、迭代说明集中在 `acceptance/`。

## 仓库结构

```text
大数据技术课程实践/
├── ClassLoop/                 # React + FastAPI 课堂产品
├── venture_agent/             # DeepSeek Agent、RAG、项目指导与评审能力
├── acceptance/                # 版本、测试、汇报与证据索引
├── start_classloop.ps1        # 推荐的统一启动入口
└── README.md
```

## Git 工作流

`大数据技术课程实践/` 是唯一需要维护的 Git 仓库。`venture_agent/` 现在是父仓库中的普通目录：后续对它的修改也在此提交，并且只推送到 `https://github.com/wytwyt893/ClassLoop.git`，不要再更新旧 VentureAgent 远端。

## 首次克隆后的准备

在仓库根目录执行：

```powershell
py -m venv ClassLoop\backend\.venv
ClassLoop\backend\.venv\Scripts\python.exe -m pip install -r ClassLoop\backend\requirements.txt
npm.cmd --prefix ClassLoop\frontend ci

py -m venv venture_agent\backend\.venv
venture_agent\backend\.venv\Scripts\python.exe -m pip install -r venture_agent\backend\requirements.txt

Copy-Item ClassLoop\backend\.env.example ClassLoop\backend\.env
Copy-Item ClassLoop\frontend\.env.example ClassLoop\frontend\.env
Copy-Item venture_agent\backend\.env.example venture_agent\backend\.env
```

如需 DeepSeek 真实回复，在 `venture_agent\backend\.env` 中填写：

```env
DEEPSEEK_API_KEY=你的密钥
```

不要提交 `.env`。未填写密钥时服务仍能启动，但 Agent 运行会明确显示 `degraded / deterministic_fallback`，不能当作真实模型成功。

## 一键启动

推荐完整模式：

```powershell
.\start_classloop.ps1 -Mode Full
```

它会启动 ClassLoop 前后端、VentureAgent，并检查两套 Neo4j。只使用不依赖 Agent 的课堂基础功能时可运行：

```powershell
.\start_classloop.ps1 -Mode Visual
```

主要地址：

- ClassLoop：http://127.0.0.1:5173
- ClassLoop API：http://127.0.0.1:8100/docs
- VentureAgent API：http://127.0.0.1:8140/docs
- 最终验收中心：http://127.0.0.1:5173/acceptance
- VentureAgent Neo4j：http://127.0.0.1:7474，Bolt `7687`
- ClassLoop Neo4j：http://127.0.0.1:7475，Bolt `7688`

两套 Neo4j 使用不同数据卷和端口，避免 ClassLoop 原课件图谱被 VentureAgent 数据覆盖。

## 演示入口

- 学生：首页进入学生端，演示课堂码 `240805`
- 教师：`/teacher`，本机演示账号 `teacher@classloop.local` / `classloop123`
- 管理员：`/admin`，本机演示账号 `admin@classloop.local` / `classloop-admin`
- 验收中心：`/acceptance`

上述账号仅为本机课程演示默认值，实际部署必须通过环境变量更换管理员密码。

## V2.2 Agent 与 RAG

1. ClassLoop 将当前课件页或匿名课堂数据组装为带定位的 `evidence_items`。
2. VentureAgent 使用 `zh-bigram-keyword-v1` 对中文二元词组和英文关键词进行可复现排序。
3. DeepSeek 只能基于命中证据回答，并使用 `[E1]`、`[E2]` 等编号引用。
4. 输出必须通过 F/I/H/S、流程结构、局限和引用校验；不合格时明确降级。
5. 通过校验的相同请求缓存 10 分钟，管理员可核查是否命中缓存及节省的模型调用次数。

学生公共 Agent 接口要求有效临时课堂身份，并限制每位学生每分钟最多 8 次请求。

## 测试

```powershell
cd venture_agent\backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v

cd ..\..\ClassLoop\backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v

cd ..\frontend
npm run lint
```

当前结果：VentureAgent 8/8、ClassLoop 产品 Agent 2/2、前端 lint/typecheck/build 全部通过。真实 DeepSeek 与缓存耗时、关键 run_id 和边界说明见 [V2.2 产品与 RAG 迭代说明](acceptance/ITERATION_V2_2_PRODUCT_RAG.md)。

## 验收与证据

- [验收包使用说明](acceptance/README.md)
- [最终证据索引](acceptance/EVIDENCE_INDEX.md)
- [回归测试报告](acceptance/TEST_REPORT.md)
- [版本清单](acceptance/VERSION.json)
- [V2.2 产品与 RAG 迭代说明](acceptance/ITERATION_V2_2_PRODUCT_RAG.md)

当前已证明功能链路、引用追溯、异常降级与缓存性能；尚不能用这些工程测试代替真实课堂学习效果或正式竞赛成绩。
