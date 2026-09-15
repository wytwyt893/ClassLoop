# 第一阶段 Word 报告写作入口

## 当前结论

截至 2026-09-08，编写 A–E 完整 Word 报告所需的最小材料已经具备。报告可以从零开始撰写，不使用现有项目简介 PPT 作为底稿。

## 建议正文结构

### A 项目方向 用户场景与问题依据

1. ClassLoop 项目名称、教育数字化方向与目标用户边界。
2. 一个主要使用场景和一个不适用场景。
3. 三项独立公开资料及局限。
4. F/I/H/S 结论台账。
5. 四项关键创业假设、未来验证方法和本阶段实践诚信边界。

### B 方案 创新假设 发展逻辑与风险

1. “讲解位置—学生反馈—教师动作—复测”的产品流程。
2. 不使用产品、通用投票问卷工具、ClassLoop 三种做法比较。
3. 页级绑定、结构化上下文和教师决策权三项机制创新。
4. 使用者、触达方式、资源、成本与可持续方式。
5. 数据、伦理、知识产权、合规、技术和实施风险。

### C Agent V1 冻结与三流程基线

1. 冻结版本、模型、Prompt、知识库、工具、环境和限制。
2. 2026-09-06 T2 首次失败及人工配置修复。
3. T1、T2、T3 冻结后基线汇总。
4. 一次统一基线之外的真实课程材料整理使用。
5. 原始日志索引与人工干预说明。

### D Agent 问题案例 归因与优先级

正文选择 5 个重点案例：CL-T-01、CL-W-02、CL-S-03、CL-E-05、CL-S-06。其余两个案例可放附录。这样覆盖 T1/T2/T3，并包含证据真实性问题。

### E 阶段汇报与材料规范

按约 5 分钟组织：项目定位 40 秒；问题依据和 F/I/H/S 60 秒；方案与创新 60 秒；发展风险 40 秒；三流程与人工干预 70 秒；问题案例和下一阶段 50 秒。

组内分工只按真实情况填写。若为一人完成，可如实写为同一人承担项目整理、Agent 测试、证据核验和报告制作；若为多人，不补写未实际参与者。

## 证据索引

| 证据 | 位置 | 用途 |
|---|---|---|
| 新版作业要求 | 工作区根目录 `第一阶段提交说明.pdf` 及用户粘贴文本 | 验收标准 |
| 项目事实与边界 | `ClassLoop/ClassLoop_项目交接与进度说明_2026-09-03.md`、代码和运行记录 | A/B 的项目事实 |
| A/B 最小材料 | `ClassLoop/evidence/stage1_working/A_B_project_basis.md` | 公开资料、F/I/H/S、假设、替代方案和风险 |
| V1 最终冻结 | `ClassLoop/evidence/v1_freeze/S02_v1_final_freeze.md` | C 区冻结说明 |
| 冻结文件哈希 | `ClassLoop/evidence/v1_freeze/v1_final_manifest.json` | 版本复现 |
| 历史冻结尝试 | `ClassLoop/evidence/v1_freeze/S01_freeze_gate.md` | 说明先前冻结不完整，防止版本冒充 |
| T2 首次失败 | `ClassLoop/backend/evidence/runtime_logs/baseline_f534f81d-1fbb-4d06-9800-35d29a33bf54.json` | 首次失败和人工干预 |
| T1 原始日志 | `ClassLoop/evidence/runtime_logs/baseline_049a6a96-4d6e-461f-9962-42268268d8b1.json` | T1 基线与案例 CL-S-04、CL-W-07 |
| T2 原始日志 | `ClassLoop/evidence/runtime_logs/baseline_5a5aca7d-94f2-4c96-be8e-ba963c545d2e.json` | T2 基线与案例 CL-W-02、CL-S-03 |
| T3 原始日志 | `ClassLoop/evidence/runtime_logs/baseline_2dea88cc-a5d3-4a76-92a4-7b283a181c07.json` | T3 基线与案例 CL-E-05、CL-S-06 |
| 实际课程任务日志 | `ClassLoop/evidence/runtime_logs/baseline_02086ec6-3fb0-42b1-9a11-b84ed8f40483.json` | 统一基线之外的真实使用和 T2 问题复现 |
| 基线与案例底稿 | `ClassLoop/evidence/stage1_working/C_D_baseline_and_cases.md` | C/D 正文来源 |

## 写报告时仍需真实填写的信息

- 组号、课程名称、教师名称和提交日期。
- 组员姓名及真实分工；未知时不虚构。
- 是否需要匿名化演示账号、日志路径或学生昵称。
- 最终报告封面格式和学校模板；没有模板时使用普通课程报告格式。

上述信息不阻碍正文起草，可以先保留明确占位符，最终提交前再替换。

