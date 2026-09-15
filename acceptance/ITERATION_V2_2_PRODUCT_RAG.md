# V2.2 产品与 RAG 迭代说明

日期：2026-09-16
版本：`classloop-agent-v2.2-evidence-rag`

这一版不只增加验收入口，而是同时修改学生端、教师端、管理员端和 VentureAgent 核心能力。

## ClassLoop 三端新增功能

### 学生端：Evidence Tutor

- 学生可在课堂页面直接询问当前课件页。
- 后端从当前页和相邻页的解析文本块中检索最相关的 3 条证据，再交给 `learning_tutor` 回答。
- 回答显示 `[E1]` 等引用编号、课件名、页码、文本块、命中分和 run_id。
- 不把昵称、头像或个人答案发送给 VentureAgent。
- 必须持有仍在线的临时课堂身份，每位学生每分钟最多调用 8 次。

使用：学生通过课堂码进入课堂，教师选择课件页后，在“对当前课件页追问”输入问题并点击“让 AI 按证据讲解”。

### 教师端：Evidence Teaching Coach（F4）

- 原“当前页 AI 诊断”升级为独立 `evidence_teaching_coach`。
- 输入由当前课件页、匿名页级反馈和匿名作答组成。
- 输出固定围绕“可能的共同误区—引用证据—教师干预—复测题—下一次采集数据”。
- 页面可展开每条 `[E1]` 引用对应的原始课件页或匿名汇总定位。
- 继续保留人工核验提示，不根据匿名聚合结果给单个学生贴标签。

使用：教师进入课堂结果页，先选择正在讲解的课件页，再点击“生成证据化干预建议”。

### 管理员端：Agent 运行审计

- “系统数据中心 → 关系数据库 → Agent 运行审计”新增只读表格。
- 可核查学生/教师调用、F1/F4、Agent 名称与版本、completed/degraded、live/cache、证据数、引用编号、耗时和 run_id。
- 新表 `agent_product_runs` 只保存 actor_role，不保存学生昵称或头像。

## VentureAgent 新增能力

### 轻量 RAG 检索

- 新增 `zh-bigram-keyword-v1`：对中文二元词组和英文关键词计算覆盖度与密度，无需新增向量数据库依赖。
- 调用方通过 `evidence_items` 提供自己拥有的材料；返回完整 `retrieval.hits`，包括 sourceType、locator、excerpt、matchedTerms、score 和 citation。
- 新增 `POST /api/evidence/retrieve`，可不调用大模型而单独复现检索排序。

### 引用协议校验

- 有检索证据时，真实模型回答必须至少使用一个允许的 `[E1]` 等引用。
- 仍检查 F/I/H/S 事实边界、流程结构和局限说明。
- 缺引用或缺事实边界时标为 `degraded / deterministic_fallback`，不会把不合格回答伪装成成功。

### 重复请求缓存

- 以 Agent 版本、流程、标准、输入和检索命中内容计算缓存键。
- 合格真实回答在内存中缓存 10 分钟；完全相同请求返回 `live_model_cache`。
- 记录 `cacheHit`、`savedModelCalls`、`retrievalMs`、`modelMs` 和 `totalMs`。
- 仅缓存通过协议校验的真实回答；降级回答不会进入缓存。

## 测试能证明什么

| 证据 | 结果 | 能证明的改进 |
|---|---|---|
| 8 项 VentureAgent 单测 | 全部通过 | F1/F2/F3/F4、相关证据排序、漏引用拒绝、缓存读写、降级日志 |
| 2 项 ClassLoop 产品单测 | 全部通过 | 当前页优先与页码定位、每位学生每分钟 8 次限流 |
| 独立 RAG 真实调用 | 8,215.3 ms | DeepSeek 回答通过全部协议并引用 `[E1]` |
| 同请求第二次调用 | 0.0 ms | `live_model_cache`，节省 1 次模型调用；相对该样本减少约 100% 等待时间 |
| ClassLoop 学生端到端 | 7,546.1 ms，命中 3 条 | 课堂页 → ClassLoop → VentureAgent → DeepSeek → 引用回答 → 审计表完整贯通 |
| 学生端重复请求 | 0.0 ms | 缓存命中且仍保留独立 run_id |
| ClassLoop 教师 F4 端到端 | 8,563.7 ms，命中 3 条 | 课件/匿名反馈/回答 → 教学干预与复测闭环 |
| 教师 F4 重复诊断 | 1.0 ms | 缓存命中，节省 1 次模型调用 |
| 无临时课堂身份调用 | HTTP 401 | 付费公共接口不会被未入课堂者直接调用 |
| 前端 lint/typecheck/build | 全部通过，112 modules | 三端新增 UI 可生产构建 |

关键原始日志：

- 独立 RAG 真实：`venture_agent/evidence/runtime_logs/acceptance_c7f5ce70-aca9-41cc-a928-6ae6fc118dec.json`
- 独立 RAG 缓存：`venture_agent/evidence/runtime_logs/acceptance_edad0451-3e91-4e9e-90f0-9ad2ce83db0b.json`
- 学生端真实：`venture_agent/evidence/runtime_logs/acceptance_085a23c6-fb3a-42e6-8974-87c693fff5f2.json`
- 学生端缓存：`venture_agent/evidence/runtime_logs/acceptance_1a915433-712a-463c-bf4d-8c99f351d77c.json`
- 教师 F4 真实：`venture_agent/evidence/runtime_logs/acceptance_46a1892e-da2e-4563-818f-953de15d7fcf.json`
- 教师 F4 缓存：`venture_agent/evidence/runtime_logs/acceptance_f8b7175a-96fc-40ff-a14e-325d5c23d17d.json`
- F4 明确降级：`venture_agent/evidence/runtime_logs/acceptance_74859ac7-85d1-4a69-98b4-4ccbea1157f1.json`

## 对标挑战杯/创新大赛时的讲法

- 创新：从“AI 给一段建议”升级为“页级上下文检索—可定位引用—教师干预—复测—审计”的课堂闭环。
- 价值：学生疑问不再脱离当时课件；教师能看见判断来自哪一页，而不是盲信模型。
- 可行性：复用现有课件解析和 SQLite/Neo4j 数据，不要求额外部署向量数据库。
- 可信：模型输出有协议门禁，失败明确降级；每次调用有 run_id 和原始 JSON。
- 成本：重复请求不再重复调用 DeepSeek，管理员能看到实际缓存命中和节省次数。

## 仍然不能夸大的地方

- 当前检索是轻量关键词/中文二元词组算法，不等同于成熟向量检索；后续可增加 embedding 与离线检索评测集。
- 上述性能是本机单次样本，不代表所有网络和输入下都能达到相同耗时。
- 已证明功能链路与工程性能，尚未证明真实课堂学习效果；挑战杯材料仍需补真实教师/学生试点数据。
