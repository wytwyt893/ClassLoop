# 最终版本回归测试报告

测试日期：2026-09-16  
目标版本：`classloop-agent-v2.2-evidence-rag`（保留下方 V2.1 基线记录）

## V2.2 产品/RAG增量测试（2026-09-16）

| 测试 | 结果 |
|---|---|
| VentureAgent 单元测试 | 8/8 通过，覆盖 F4、检索排序、引用门禁、缓存 |
| ClassLoop 产品 Agent 单元测试 | 2/2 通过，覆盖课件定位与每人每分钟 8 次限流 |
| Python 语法编译 | VentureAgent 与 ClassLoop 后端通过 |
| ClassLoop 前端 lint/typecheck/build | 通过，Vite 112 modules |
| 独立 DeepSeek RAG / 重复缓存 | 8,215.3 ms / 0.0 ms，第二次节省 1 次模型调用 |
| 学生课堂端到端 / 重复缓存 | 7,546.1 ms / 0.0 ms，均命中 3 条课件证据 |
| 教师 F4 端到端 / 重复缓存 | 8,563.7 ms / 1.0 ms，`evidence_teaching_coach` |
| 管理员审计接口 | 可读取 actorRole、Agent版本、状态、模式、证据数、引用、缓存与耗时 |
| 学生接口身份保护 | 无有效临时课堂身份返回 HTTP 401 |

完整功能、日志编号与测试边界见 `acceptance/ITERATION_V2_2_PRODUCT_RAG.md`。

## 自动测试结果

| 测试 | 命令/方式 | 结果 | 对应评分 |
|---|---|---|---|
| Python语法 | `python -m py_compile` 检查两个后端新增/修改模块 | 通过 | B5、C3 |
| F1协议 | 单元测试检查恰好3个理解题、S标记、知识库边界 | 通过 | B2、C5 |
| F2协议 | 单元测试检查开头至少2个澄清问题及不编造结论 | 通过 | B3、B1 |
| F3协议 | 单元测试检查独立评审、5个明确维度、权重合计100 | 通过 | B4、B1 |
| 降级留痕 | 单元测试检查degraded、fallback、error、run_id写入JSON | 通过 | B5、C2 |
| VentureAgent路由 | 导入FastAPI应用并核对 `/api/acceptance/meta`、`/api/acceptance/run` | 通过 | B7、C3 |
| ClassLoop路由 | 导入FastAPI应用并核对 `/api/acceptance/status`、`/api/acceptance/run` | 通过 | B7、C3 |
| ClassLoop前端 | `npm.cmd run build`，Vite生产构建 | 通过（111 modules） | A6、B5、C3 |
| 双服务端到端 | ClassLoop测试端口调用VentureAgent测试端口，显式关闭模型 | 通过，HTTP 200 | B5、C2、C3 |
| V2真实模型F2 | 使用本机已配置DeepSeek执行固定F2输入，并检查输出协议 | 通过，8.06秒，协议4项全通过 | B1、B3、B6、B7 |
| PowerShell启动器 | 根启动器与ClassLoop转发脚本进行PowerShell AST语法解析 | 通过 | C3 |

单元测试文件：`venture_agent/backend/tests/test_acceptance.py`。

## 可核查的最终版本离线运行

以下记录均明确设置为 `status=degraded`、`mode=deterministic_fallback`，用于证明断网/无密钥时的流程、边界和日志能力，不作为真实模型成功证据：

| 流程 | run_id | 原始记录 |
|---|---|---|
| F1 | `acceptance_4d7e0b84-dd05-4014-a251-4e66b04cbe10` | `venture_agent/evidence/runtime_logs/acceptance_4d7e0b84-dd05-4014-a251-4e66b04cbe10.json` |
| F2 | `acceptance_890e121c-4c1c-42d6-b11f-b6818d7e73ef` | `venture_agent/evidence/runtime_logs/acceptance_890e121c-4c1c-42d6-b11f-b6818d7e73ef.json` |
| F3 | `acceptance_6545f077-0677-4e6b-a889-ca3c79b8577c` | `venture_agent/evidence/runtime_logs/acceptance_6545f077-0677-4e6b-a889-ca3c79b8577c.json` |
| ClassLoop→VentureAgent端到端F2 | `acceptance_33434944-337f-4dc1-87cb-82efbcd38daf` | `venture_agent/evidence/runtime_logs/acceptance_33434944-337f-4dc1-87cb-82efbcd38daf.json` |

真实模型成功记录：

| 流程 | run_id | 结果 | 原始记录 |
|---|---|---|---|
| F2 | `acceptance_2df3c58d-532e-47c8-a7f1-44f7520a6853` | `completed / live_model`；先提出3个澄清问题，F/I/H/S与局限字段齐全，协议校验通过 | `venture_agent/evidence/runtime_logs/acceptance_2df3c58d-532e-47c8-a7f1-44f7520a6853.json` |

## 测试边界

- 本轮仅调用一次已配置的 DeepSeek API，生成上表F2真实模型记录；其余F1/F2/F3样例均为明确降级记录。现场有密钥时页面默认优先调用真实模型，成功还需通过输出协议检查。
- 浏览器控制环境未提供可用浏览器实例，所以未完成自动截图目测；TypeScript检查和Vite生产构建已通过。现场前仍应人工打开 `/acceptance` 快速查看屏幕缩放与投影效果。
- 本报告只证明软件与流程测试，不证明真实课堂学习效果或官方竞赛成绩。
