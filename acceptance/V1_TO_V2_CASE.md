# V1→V2 优化闭环

## 结论

本轮没有另造“优化故事”，而是使用第一阶段冻结日志中的五个真实问题作为回归基线。最终版本继续迭代为 `classloop-agent-v2.2-evidence-rag`：保留独立 F1/F2/F3 接口、输出协议校验、明确降级和逐次原始日志，并新增 F4 课堂证据干预、轻量 RAG、引用门禁与重复请求缓存。

## 闭环表

| 案例 | V1问题与原始证据 | 优化目标 | V2修改 | 回归判定 |
|---|---|---|---|---|
| CL-T-01 / P0 | T2首次运行因 `CLASSLOOP_AGENT_BASE_URL` 缺失失败；`baseline_f534...json` | 运行前能判断配置；错误可读；统一启动 | 根启动脚本完整模式统一启动 VentureAgent 与 ClassLoop；验收页显示适配器状态；服务不可用返回503 | 不配置时必须明确失败；配置后F1/F2/F3可进入 |
| CL-W-02 / P1 | T2明确要求先问2个问题，V1仍直接诊断；`baseline_02086...json` | 信息不足时先澄清 | F2独立Prompt要求开头至少2个澄清问题；协议检查问号数和“澄清”字段 | 固定与随机输入均出现至少2个澄清问题，否则降级 |
| CL-S-03 / P1 | V1把虚构PulseCheck团队写入后续“证据”；`baseline_5a5aca...json` | 模拟不能冒充事实 | 所有关键判断使用F/I/H/S；规则兜底单列证据边界；S不得称为真实证据 | 输出必须显示边界；无来源时明确未提供来源 |
| CL-S-04 / P1 | T1无来源讲Dropbox人物、事件和增长；`baseline_049a6...json` | 无检索来源时不讲真实品牌故事 | F1 Prompt禁止无来源真实品牌案例；无知识库状态公开为 `none-explicit-source-boundary` | F1兜底只提供[S]正反例；不生成品牌事实 |
| CL-E-05 / P1 | T3元数据是reviewer，实际传输为coach；`baseline_2dea88...json` | T3使用独立评审角色与明确标准 | 新增 `/api/acceptance/run` 的F3路径，角色固定 `project_reviewer`；支持两种竞赛参考框架 | 返回agent必须为project_reviewer，并显示维度、权重、缺口和整改 |

## 一次运行怎样证明闭环

1. 打开 `/acceptance` 的“02 Agent V1→V2”。
2. 任选 F1/F2/F3，允许助教修改输入。
3. 点击运行，检查 `agent`、`status`、`promptVersion` 和 `run_id`。
4. 打开 `venture_agent/evidence/runtime_logs/<run_id>.json`，核对页面内容与原始记录一致。
5. 若模型失败，检查 `status=degraded`、`mode=deterministic_fallback` 和 `error`；这证明异常被看见和记录，而非证明模型成功。

已保存的一条真实模型V2回归：`acceptance_2df3c58d-532e-47c8-a7f1-44f7520a6853`。该F2运行返回3个澄清问题，`status=completed`、`mode=live_model`，四项协议检查全部通过；原始输入、Prompt与未经人工改写的回复在同名JSON中。

## 优化取舍与剩余问题（B8）

已解决：统一入口、三角色分离、F2先澄清、F1来源边界、F3明确标准、协议失败可见、逐次run_id。

延期：真实外部知识库检索。原因是验收前接入来源质量不明的检索会扩大虚假引用风险；当前选择明确显示 `knowledgeBaseVersion=none-explicit-source-boundary`。

延期：真实课堂效果验证。原因是不能在短期内把模拟课堂冒充真实用户实验；下一步应记录一节真实课的“反馈—教师动作—复测”链路。

保留局限：规则兜底只能保证结构和边界，不能替代大模型推理，也不能证明竞赛官方得分；页面必须把它标为“明确降级”。

下一优先级：建立带可定位URL/DOI/数据集ID的检索层，并为来源可达性、引用一致性和重复运行一致性增加自动测试。
