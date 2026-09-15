# 最终证据索引

仓库根：`大数据技术课程实践/`  
现场定位：在 VS Code 按 `Ctrl+P`，复制下表路径。Agent 原始 JSON 可按 `runId` 全仓搜索。

| 检查内容 | 证据位置 | 可核查内容 |
|---|---|---|
| Agent V1版本 | `ClassLoop/evidence/v1_freeze/S02_v1_final_freeze.md` | V1名称、commit、模型、Prompt版本、角色路由 |
| Agent V1文件清单 | `ClassLoop/evidence/v1_freeze/v1_final_manifest.json` | 冻结文件哈希与版本关系 |
| Agent V2/最终版本 | `acceptance/VERSION.json` | 最终版本号、F1/F2/F3独立角色与入口 |
| 完整V1→V2案例 | `acceptance/V1_TO_V2_CASE.md` | 原始问题、修改、回归标准、取舍 |
| F1 V1原始运行 | `ClassLoop/evidence/runtime_logs/baseline_049a6a96-4d6e-461f-9962-42268268d8b1.json` | 无来源Dropbox故事问题 |
| F2 V1原始运行 | `ClassLoop/evidence/runtime_logs/baseline_02086ec6-3fb0-42b1-9a11-b84ed8f40483.json` | 跳过澄清直接诊断 |
| F2 V1模拟污染 | `ClassLoop/evidence/runtime_logs/baseline_5a5aca7d-94f2-4c96-be8e-ba963c545d2e.json` | PulseCheck模拟案例进入证据推理 |
| F3 V1原始运行 | `ClassLoop/evidence/runtime_logs/baseline_2dea88cc-a5d3-4a76-92a4-7b283a181c07.json` | T3实际路由到project_coach |
| 首次失败运行 | `ClassLoop/backend/evidence/runtime_logs/baseline_f534f81d-1fbb-4d06-9800-35d29a33bf54.json` | 地址未配置、status=failed、output=null |
| 最终Agent运行记录 | `venture_agent/evidence/runtime_logs/` | 输入、完整Prompt、输出、协议校验、模式、run_id |
| V2真实模型F2样例 | `venture_agent/evidence/runtime_logs/acceptance_2df3c58d-532e-47c8-a7f1-44f7520a6853.json` | completed、live_model、3个澄清问题、协议校验通过 |
| 测试结果 | `acceptance/TEST_REPORT.md` | 后端、F1/F2/F3、前端构建与异常降级 |
| 部署/运行说明 | `README.md` | 克隆、依赖、env、端口、统一启动入口 |
| 环境变量模板 | `ClassLoop/backend/.env.example`、`ClassLoop/frontend/.env.example`、`venture_agent/backend/.env.example` | 无真实密钥的可复现配置 |
| 人机边界 | `acceptance/HUMAN_AI_BOUNDARY.md` | Agent、规则、人工、Codex的工作边界 |
| 第一阶段项目基础 | `ClassLoop/evidence/stage1_working/A_B_project_basis.md` | 用户、场景、问题、替代方案、假设 |
| 第一阶段V1诊断 | `ClassLoop/ClassLoop_第一阶段项目立项与Agent_V1诊断基线报告_精简版.md` | 5个真实问题案例及优先级 |
| 助教1材料 | `acceptance/TA1_PROJECT_DECK.md` | 7页独立项目展示稿 |
| 助教2材料 | `acceptance/TA2_AGENT_DECK.md` | 7页独立Agent展示稿 |
| 评分要求原文 | `验收准备说明.md`、`助教1.md`、`助教2.md`、`助教3.md` | 本轮针对性优化依据 |

## 一条完整证据链

`V1冻结说明` → `V1原始JSON/run_id` → `V1问题案例` → `V2代码与版本清单` → `V2回归测试` → `现场随机运行的新run_id` → `剩余风险与人机边界`。

## 安全检查

- `.env`、数据库、密钥、私钥均被根 `.gitignore` 排除。
- `.env.example` 只保留变量名和示例值。
- 课程模拟数据使用 `[S]` 标记，不作为真实调研。
- Agent 无法核验的外部事实不得进入 `[F]` 证据。
