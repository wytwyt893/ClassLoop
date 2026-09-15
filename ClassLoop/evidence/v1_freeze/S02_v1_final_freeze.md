# ClassLoop Agent V1 最小验收冻结记录

冻结时间：2026-09-08T17:46:20+08:00

## 冻结对象

- Agent 名称：ClassLoop Agent V1
- Agent 版本：classloop-v1-freeze-20260908
- ClassLoop 提交：ebcd6962c3f75b4488ca9f8cc8a3ffd62322129a
- 外部推理服务：工作区外层 `venture_agent/backend`
- 模型：deepseek-chat
- 基线 Prompt 版本：classloop-baseline-v1-20260908
- 知识库版本：none-no-verified-external-kb
- 工具与 API：ClassLoop `POST /api/agent/baseline/run` 调用 VentureAgent `POST /api/chat`
- 运行环境：Windows，Python 3.12.14；ClassLoop FastAPI 0.116.1；VentureAgent FastAPI 0.110.3

## 三个流程

- T1 理论学习：ClassLoop 元数据角色 `learning_tutor`，传输角色 `learning_tutor`。
- T2 项目指导：ClassLoop 元数据角色 `project_coach`，传输角色 `project_coach`。
- T3 项目评审：ClassLoop 元数据角色 `project_reviewer`，但 V1 实际传输角色仍为 `project_coach`。

## 知识库与模拟边界

本次基线未确认调用可核验的外部知识库。VentureAgent 的 T1/T2 回复由模型和代码内 Prompt 生成；推理图由模型生成或程序补全。项目教练字段 `simulated_case` 明确要求生成虚构相似案例，因此报告中一律标记为 S 模拟，不作为真实案例、市场证据或知识库检索证据。

## 运行方式

1. 在 `venture_agent/backend` 启动 Uvicorn，端口 8140。
2. 在 `ClassLoop/backend` 设置 `CLASSLOOP_AGENT_BASE_URL=http://127.0.0.1:8140`，启动 Uvicorn，端口 8100。
3. 使用教师账号登录后调用 `POST /api/agent/baseline/run`，请求中固定写入 Agent 版本、模型、Prompt 版本和知识库版本。
4. 每次运行同时写入 SQLite 和 `ClassLoop/backend/evidence/runtime_logs`，失败运行不删除。

## 已知限制

- T3 没有独立的评审传输角色，当前复用项目教练。
- 没有可核验的外部知识库检索轨迹。
- 人工干预字段不会自动采集全部人工操作，需要在测试汇总中补记。
- 2026-09-06 的 S01 冻结清单已发生代码哈希漂移，仅作为历史记录；本文件与 `v1_final_manifest.json` 共同定位本次冻结。

