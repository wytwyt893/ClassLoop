# VentureAgent

VentureAgent 是本课程仓库中的 Agent 服务。它继续参与 ClassLoop V2.2 开发，但不再作为独立 Git 仓库维护：所有修改都由父级 `ClassLoop` 仓库提交和推送。

当前版本：`classloop-agent-v2.2-evidence-rag`。

## Agent 流程

| 流程 | Agent | 作用 |
|---|---|---|
| F1 | `learning_tutor` | 理论解释、正反例和理解检查；ClassLoop 学生课件追问使用此流程 |
| F2 | `project_coach` | 先澄清用户、场景和证据，再给项目下一步 |
| F3 | `project_reviewer` | 参考挑战杯/创新大赛维度检查证据、风险和整改动作 |
| F4 | `evidence_teaching_coach` | 根据课件、匿名反馈与作答生成教学干预和复测闭环 |

## V2.2 RAG 与可信输出

- 接收调用方提供的 `evidence_items`，不声称访问未连接的外部知识库。
- 使用 `zh-bigram-keyword-v1` 对中文二元词组和英文关键词进行确定性排序。
- 返回 `retrieval.hits`：证据编号、原始定位、摘要、匹配词、得分和 `[E1]` 引用。
- 真实模型回答必须通过 F/I/H/S、流程结构、局限说明和引用校验。
- 校验失败或模型不可用时返回 `degraded / deterministic_fallback`，同时保存失败原因。
- 通过校验的相同请求缓存 600 秒；缓存命中返回 `live_model_cache` 并记录节省的模型调用次数。
- 每次运行生成独立 run_id，原始 JSON 保存在 `evidence/runtime_logs/`。

## 环境准备

```powershell
cd venture_agent\backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

在 `.env` 中填写 DeepSeek 密钥：

```env
DEEPSEEK_API_KEY=你的密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

`.env` 不得提交。没有密钥时服务仍可启动，并明确使用结构化降级。

VentureAgent 图谱默认使用 Neo4j Browser `7474`、Bolt `7687`；ClassLoop 的 Neo4j 使用另一套端口和数据卷。

## 启动

推荐直接在父级仓库运行：

```powershell
.\start_classloop.ps1 -Mode Full
```

单独调试 VentureAgent：

```powershell
cd venture_agent\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8140
```

API 文档：http://127.0.0.1:8140/docs

主要接口：

- `GET /api/acceptance/meta`：版本、流程和评审框架
- `POST /api/acceptance/run`：运行 F1/F2/F3/F4，可传证据、top_k 和缓存开关
- `POST /api/evidence/retrieve`：只复现检索排序，不调用大模型
- `GET /api/acceptance/runs`：查看最近运行元数据

## 测试与性能证据

```powershell
cd venture_agent\backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe scripts\run_rag_cache_sample.py
```

当前单元测试 8/8 通过，覆盖 F1/F2/F3/F4、检索排序、引用门禁、缓存和降级日志。本机真实样本中，首次 DeepSeek RAG 调用为 8,215.3 ms，相同请求缓存命中为 0.0 ms并节省一次模型调用。该数字是单次本机证据，不代表所有网络环境。

完整 run_id 和测试边界见父级 [V2.2 产品与 RAG 迭代说明](../acceptance/ITERATION_V2_2_PRODUCT_RAG.md)。
