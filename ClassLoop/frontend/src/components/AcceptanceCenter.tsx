import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import { API_BASE_URL } from "../services/dataProvider";

type Station = "project" | "agent" | "evidence";
type Flow = "F1" | "F2" | "F3";

type RunResult = {
  runId: string;
  version: string;
  flow: Flow;
  flowName: string;
  agent: string;
  promptVersion: string;
  knowledgeBaseVersion: string;
  status: "completed" | "degraded";
  mode: "live_model" | "deterministic_fallback";
  modeLabel: string;
  reply: string;
  durationMs: number;
  rawLogPath: string;
  error?: string | null;
  validation?: { passed: boolean; failedChecks: string[] };
  rubric?: {
    name: string;
    disclaimer: string;
    overallScore: number;
    grade: string;
    dimensions: Array<{ key: string; name: string; weight: number; score: number; status: string }>;
  } | null;
  claims: Array<{ tag: "F" | "I" | "H" | "S"; label: string; text: string }>;
  limitations: string[];
  nextActions: string[];
};

const stationItems: Array<{ key: Station; number: string; title: string; score: string; subtitle: string }> = [
  { key: "project", number: "01", title: "项目成果与逻辑", score: "助教1 · 30分", subtitle: "6分钟讲清 ClassLoop 为什么成立" },
  { key: "agent", number: "02", title: "Agent V1→V2", score: "助教2 · 40分", subtitle: "可随机抽测 F1 / F2 / F3" },
  { key: "evidence", number: "03", title: "工程证据与可信性", score: "助教3 · 30分", subtitle: "版本、run_id、日志快速定位" },
];

const samples: Record<Flow, string> = {
  F1: "我不理解“问题—场景—方案匹配”。请面向创新创业初学者解释概念，给出正反例，最后用3个问题检查我是否理解。不要编造引用或真实用户数据。",
  F2: "ClassLoop 面向高校同步理论课堂，学生可以对具体课件页提交“不理解、太快、有疑问”等反馈，教师在结果页查看并决定是否调整讲解。当前只有软件原型和模拟课堂数据，还没有正式用户调研。请先澄清，再告诉我24小时内最该补什么证据。",
  F3: "ClassLoop 的目标用户是高校同步理论课教师和学生。系统已实现教师/学生/管理员三入口、SQLite持久化、SSE实时反馈、课件页级反馈、Neo4j课件图谱和VentureAgent调用。现有证据是可运行原型、接口日志和测试记录；真实课堂使用效果、持续使用意愿和规模化成本仍待验证。",
};

const flowMeta: Record<Flow, { name: string; role: string; promise: string }> = {
  F1: { name: "理论学习", role: "learning_tutor", promise: "解释 + 正反例 + 恰好3个理解检查" },
  F2: { name: "项目指导", role: "project_coach", promise: "先问至少2个澄清问题，不替学生造事实" },
  F3: { name: "评审反馈", role: "project_reviewer", promise: "独立评审角色 + 明确标准 + 缺口与整改" },
};

const claimStyles = {
  F: "border-emerald-200 bg-emerald-50 text-emerald-800",
  I: "border-blue-200 bg-blue-50 text-blue-800",
  H: "border-amber-200 bg-amber-50 text-amber-800",
  S: "border-violet-200 bg-violet-50 text-violet-800",
};

function Tag({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "cyan" | "green" | "amber" | "violet" }) {
  const styles = {
    slate: "bg-slate-100 text-slate-700",
    cyan: "bg-cyan-100 text-cyan-800",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    violet: "bg-violet-100 text-violet-800",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${styles[tone]}`}>{children}</span>;
}

function ProjectStation() {
  const evolution = [
    ["第一阶段 V1", "完成项目定位和 Agent 基线，发现启动阻断、角色误路由、证据混淆等真实问题。"],
    ["产品闭环", "补齐三角色入口、数据库持久化、学生作答、SSE 实时刷新与教师广播。"],
    ["课堂上下文", "把反馈绑定到具体课件页，并建立课堂—文档—页面—文本块的 Neo4j 图谱。"],
    ["最终 V2.1", "分离 F1/F2/F3 角色、加入协议校验、明确降级状态、run_id 和原始日志。"],
  ];
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-7 text-white shadow-xl sm:p-10">
        <div className="flex flex-wrap items-center gap-2"><Tag tone="cyan">项目定位</Tag><span className="text-xs font-bold text-blue-100">A1 · A2 · A6</span></div>
        <h2 className="mt-5 text-3xl font-black sm:text-5xl">ClassLoop：把“没人举手”变成可处理的课堂反馈</h2>
        <p className="mt-5 max-w-4xl text-base leading-8 text-blue-50 sm:text-lg">面向高校同步理论课堂：学生把“不理解 / 太快 / 有疑问”绑定到具体课件页，教师结合回答分布与 Agent 建议决定是否重讲、举例或复测。系统辅助判断，但不替教师给学生贴标签。</p>
        <div className="mt-7 grid gap-3 md:grid-cols-4">
          {[["用户", "高校理论课教师与课堂学生"], ["场景", "讲授进行中，疑问刚发生的时刻"], ["问题", "举手门槛高，课后反馈丢失上下文"], ["价值", "更早发现共性误区并形成干预闭环"]].map(([title, value]) => <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p className="text-xs font-black text-cyan-200">{title}</p><p className="mt-2 text-sm font-bold leading-6">{value}</p></div>)}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4"><div><Tag tone="violet">项目迭代</Tag><h3 className="mt-3 text-2xl font-black">不是功能堆砌，而是围绕同一课堂问题收拢</h3></div><span className="hidden text-5xl sm:block">↗</span></div>
        <div className="mt-7 grid gap-4 lg:grid-cols-4">
          {evolution.map(([title, detail], index) => <div key={title} className="relative rounded-2xl bg-slate-50 p-5"><span className="text-xs font-black text-blue-600">0{index + 1}</span><h4 className="mt-3 font-black text-slate-900">{title}</h4><p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p></div>)}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Tag tone="green">解决方案与创新 · A3</Tag>
          <h3 className="mt-4 text-2xl font-black">核心机制：反馈必须回到上下文</h3>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm font-black">
            {['课件页', '学生轻量反馈', '实时聚合', 'Agent诊断', '教师干预', '变式复测'].map((item, index) => <span key={item} className="contents"><span className="rounded-xl bg-slate-950 px-4 py-3 text-white">{item}</span>{index < 5 && <span className="text-blue-500">→</span>}</span>)}
          </div>
          <p className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm leading-7 text-blue-900"><strong>实质差异：</strong>普通举手只覆盖愿意表达的人，课后问卷缺少发生页码，通用投票只汇总答案，通用聊天机器人脱离课堂状态；ClassLoop 将页级上下文、群体反馈、教师动作和复测串成同一条证据链。</p>
          <p className="mt-3 text-sm leading-7 text-slate-500"><strong>明确不解决：</strong>不自动判定学生能力，不替代教师教学，不声称已证明学习成绩提升。</p>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Tag tone="amber">证据、假设与风险 · A4/A5</Tag>
          <h3 className="mt-4 text-2xl font-black">先说明边界，反而更经得住追问</h3>
          <div className="mt-6 space-y-3">
            {[
              ["F", "已完成可运行原型、SQLite记录、SSE事件、Neo4j图谱和Agent原始日志。"],
              ["I", "页级反馈可能比课后问卷更容易让教师定位讲解断点。"],
              ["H", "教师愿意在授课中查看并采取行动；学生愿意持续低门槛反馈。"],
              ["S", "仓库中的演示课堂与规则得分用于验收演示，不冒充真实调研。"],
            ].map(([tag, text]) => <div key={tag} className={`rounded-2xl border p-4 text-sm leading-6 ${claimStyles[tag as keyof typeof claimStyles]}`}><strong className="mr-2">[{tag}]</strong>{text}</div>)}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate-950 p-4 text-sm text-white"><strong>最大风险</strong><p className="mt-2 leading-6 text-slate-300">功能可用不等于用户价值成立，真实课堂验证仍不足。</p></div><div className="rounded-2xl bg-emerald-600 p-4 text-sm text-white"><strong>下一步</strong><p className="mt-2 leading-6 text-emerald-50">用一节真实课程记录“反馈—查看—干预—复测”链路。</p></div></div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><Tag tone="cyan">公开依据 · 可点击核查</Tag><h3 className="mt-4 text-2xl font-black">资料支持方向价值，不冒充产品有效性证据</h3></div><code className="text-xs text-slate-500">ClassLoop/evidence/stage1_working/A_B_project_basis.md</code></div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {[
            ["教育部政策", "《教育强国建设规划纲要（2024—2035年）》支持教育数字化与智能化应用方向。", "https://www.moe.gov.cn/jyb_xxgk/moe_1777/moe_1778/202501/t20250119_1176193.html"],
            ["OECD报告", "形成性评价是了解进展、反馈并据此调整教学的循环。", "https://www.oecd.org/en/publications/unlocking-high-quality-teaching_f5b82176-en/full-report/using-formative-assessment-and-feedback_189fb6dc.html"],
            ["正式论文", "Black与Wiliam综述讨论课堂形成性评价及频繁反馈的学习潜力。", "https://doi.org/10.1080/0969595980050102"],
          ].map(([title, detail, href]) => <a key={title} href={href} target="_blank" rel="noreferrer" className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"><p className="text-xs font-black text-blue-600">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p><p className="mt-4 text-xs font-bold text-blue-700">打开原始来源 →</p></a>)}
        </div>
        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900"><strong>限制：</strong>这些材料只能支持教育数字化和形成性反馈值得研究，不能直接证明 ClassLoop 的页级机制有效、用户愿意使用或学校愿意付费。</p>
      </section>
    </div>
  );
}

function AgentStation() {
  const [flow, setFlow] = useState<Flow>("F2");
  const [standard, setStandard] = useState("internet_plus");
  const [input, setInput] = useState(samples.F2);
  const [preferLive, setPreferLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [serviceStatus, setServiceStatus] = useState<{ configured: boolean; reachable?: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/acceptance/status`).then((response) => response.json()).then(setServiceStatus).catch(() => setServiceStatus({ configured: false, message: "ClassLoop 后端未连接" }));
  }, []);

  const selectFlow = (nextFlow: Flow) => {
    setFlow(nextFlow);
    setInput(samples[nextFlow]);
    setResult(null);
  };

  const run = async () => {
    if (input.trim().length < 6) return toast.error("请输入至少 6 个字符");
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/acceptance/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow, input, standard, prefer_live_model: preferLive }),
      });
      const value = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(value.detail || "运行失败");
      setResult(value);
      toast.success(value.status === "completed" ? "真实模型运行完成，日志已保存" : "已明确降级，兜底结果与失败原因均已留痕");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "运行失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Tag tone="violet">最终版本 V2.1</Tag><Tag tone={serviceStatus?.reachable ? "green" : "amber"}>{serviceStatus?.reachable ? "VentureAgent 已连接" : serviceStatus?.configured ? "地址已配 / 服务未连接" : "等待完整模式"}</Tag></div><h2 className="mt-4 text-3xl font-black">三个核心流程，一个随机抽测入口</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{serviceStatus?.message || "正在检查 Agent 适配器…"}</p></div><div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-right"><p className="text-xs text-slate-400">版本</p><p className="mt-1 font-mono text-sm font-black text-cyan-300">classloop-agent-v2.1-acceptance</p></div></div>
        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {(Object.keys(flowMeta) as Flow[]).map((key) => <button key={key} onClick={() => selectFlow(key)} className={`rounded-2xl border p-4 text-left transition ${flow === key ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/10 bg-white/5 hover:bg-white/10"}`}><p className="text-xs font-black">{key} · {flowMeta[key].role}</p><h3 className="mt-2 text-xl font-black">{flowMeta[key].name}</h3><p className={`mt-2 text-xs leading-5 ${flow === key ? "text-slate-700" : "text-slate-400"}`}>{flowMeta[key].promise}</p></button>)}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-blue-600">现场输入</p><h3 className="mt-1 text-xl font-black">{flow} · {flowMeta[flow].name}</h3></div><button onClick={() => setInput(samples[flow])} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold hover:bg-slate-200">恢复演示输入</button></div>
          {flow === "F3" && <label className="mt-5 block text-sm font-bold text-slate-700">评审参考框架<select value={standard} onChange={(event) => setStandard(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"><option value="internet_plus">中国国际大学生创新大赛（原互联网+）参考</option><option value="challenge_cup">挑战杯创业计划赛参考</option></select></label>}
          <textarea value={input} onChange={(event) => setInput(event.target.value)} className="mt-5 min-h-64 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><input type="checkbox" checked={preferLive} onChange={(event) => setPreferLive(event.target.checked)} className="mt-1" /><span><strong>优先调用真实模型</strong><br />关闭时可现场演示“明确降级 + 仍保存日志”，不会伪装成模型成功。</span></label>
          <button onClick={() => void run()} disabled={loading} className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-4 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{loading ? "Agent 正在运行并写入原始日志…" : `运行 ${flow} 并生成 run_id`}</button>
        </section>

        <section className="min-h-[34rem] rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          {!result && <div className="grid h-full min-h-[30rem] place-items-center text-center"><div><div className="text-6xl">⌁</div><h3 className="mt-4 text-xl font-black">等待随机抽测</h3><p className="mt-2 text-sm text-slate-500">可切换任一流程、替换输入后运行，不依赖唯一案例。</p></div></div>}
          {result && <div>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5"><div><div className="flex flex-wrap gap-2"><Tag tone={result.status === "completed" ? "green" : "amber"}>{result.status === "completed" ? "真实模型完成" : "明确降级"}</Tag><Tag tone="cyan">{result.agent}</Tag>{result.validation?.passed && <Tag tone="green">协议校验通过</Tag>}</div><h3 className="mt-3 text-xl font-black">{result.flow} · {result.flowName}</h3></div><div className="text-right text-xs text-slate-500"><p>{result.durationMs} ms</p><p className="mt-1 font-mono">{result.promptVersion}</p></div></div>
            {result.error && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>降级原因：</strong>{result.error}</div>}
            {result.rubric && <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white"><div className="flex items-end justify-between gap-4"><div><p className="text-xs text-cyan-300">{result.rubric.name}</p><p className="mt-2 text-sm text-slate-300">{result.rubric.grade}</p></div><div className="text-right"><span className="text-4xl font-black">{result.rubric.overallScore}</span><span className="text-slate-400"> / 100</span></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{result.rubric.dimensions.map((item) => <div key={item.key}><div className="flex justify-between text-xs"><span>{item.name} · {item.weight}%</span><strong>{item.score}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${item.score}%` }} /></div></div>)}</div><p className="mt-4 text-[11px] leading-5 text-slate-400">{result.rubric.disclaimer}</p></div>}
            <div className="mt-5 max-h-[27rem] overflow-y-auto rounded-2xl bg-slate-50 p-5"><pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700">{result.reply}</pre></div>
            <div className="mt-4 rounded-xl border border-slate-200 p-3 text-xs text-slate-500"><p><strong>run_id：</strong><span className="break-all font-mono">{result.runId}</span></p><p className="mt-1"><strong>原始日志：</strong><span className="break-all font-mono">{result.rawLogPath}</span></p></div>
          </div>}
        </section>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Tag tone="violet">V1→V2 完整闭环 · B1/B5/B8</Tag><h3 className="mt-4 text-2xl font-black">修的都是 V1 真实出现过的问题</h3>
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs text-slate-500"><th className="p-3">V1问题与证据</th><th className="p-3">V2.1修改</th><th className="p-3">现场证明方式</th><th className="p-3">状态</th></tr></thead><tbody>{[
          ["CL-T-01：首次T2因地址缺失阻断", "根启动器统一拉起服务；页面先显示适配器状态", "关闭/恢复服务时返回可读503，不假装成功", "已解决"],
          ["CL-W-02：T2跳过澄清直接诊断", "F2协议要求开头至少2个澄清问题", "随机输入运行F2；输出协议自动检查", "已解决"],
          ["CL-S-03/04：模拟或无来源案例混入证据", "强制F/I/H/S边界；无知识库时明确不提供真实案例", "查看输出“证据边界”和原始JSON", "已解决"],
          ["CL-E-05：T3实际复用project_coach", "新增独立project_reviewer角色与F3评审API", "运行F3并查看agent、评分维度和run_id", "已解决"],
          ["真实课堂效果与来源检索不足", "不伪造验证；显式列入limitations与下一步", "页面和日志均显示未解决项", "保留风险"],
        ].map((row) => <tr key={row[0]} className="border-b border-slate-100 align-top"><td className="p-3 font-bold text-slate-900">{row[0]}</td><td className="p-3 leading-6 text-slate-600">{row[1]}</td><td className="p-3 leading-6 text-slate-600">{row[2]}</td><td className="p-3"><Tag tone={row[3] === "已解决" ? "green" : "amber"}>{row[3]}</Tag></td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

const evidenceItems = [
  ["V1版本冻结", "ClassLoop/evidence/v1_freeze/S02_v1_final_freeze.md", "版本、commit、模型、三流程角色"],
  ["V1原始运行", "ClassLoop/evidence/runtime_logs/", "T1/T2/T3、失败与真实模型原始JSON"],
  ["V1问题案例", "ClassLoop/ClassLoop_第一阶段项目立项与Agent_V1诊断基线报告_精简版.md", "CL-T-01至CL-E-05及验收条件"],
  ["V2优化闭环", "acceptance/V1_TO_V2_CASE.md", "问题→目标→修改→回归测试"],
  ["最终版本清单", "acceptance/VERSION.json", "V1/V2/最终版本关系与入口"],
  ["最终Agent日志", "venture_agent/evidence/runtime_logs/", "acceptance_run_id、输入、Prompt、输出、状态"],
  ["回归测试", "acceptance/TEST_REPORT.md", "F1/F2/F3和异常降级测试结果"],
  ["人机边界", "acceptance/HUMAN_AI_BOUNDARY.md", "Agent、人工、规则兜底、外部工具责任"],
  ["部署与复现", "README.md", "依赖、env、启动命令、端口与入口"],
  ["第一阶段材料", "ClassLoop/evidence/stage1_working/", "项目基础、基线、案例与索引"],
  ["助教1独立讲稿", "acceptance/TA1_PROJECT_DECK.md", "7页项目成果展示结构"],
  ["助教2独立讲稿", "acceptance/TA2_AGENT_DECK.md", "7页Agent优化展示结构"],
] as const;

function EvidenceStation() {
  const githubUrl = (path: string) => `https://github.com/wytwyt893/ClassLoop/${path.endsWith("/") ? "tree" : "blob"}/main/${path}`;
  const copy = async (path: string) => {
    await navigator.clipboard.writeText(path);
    toast.success("证据路径已复制");
  };
  return <div className="space-y-6">
    <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-slate-800 p-7 text-white shadow-xl sm:p-10"><div className="flex flex-wrap gap-2"><Tag tone="green">助教3无需常规PPT</Tag><Tag tone="cyan">目标：30秒内定位</Tag></div><h2 className="mt-5 text-3xl font-black sm:text-5xl">证据不是截图合集，而是可回到原始输入和版本</h2><p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">每条 Agent 运行包含版本、角色、Prompt版本、输入、输出、协议校验、失败原因、运行模式、run_id 和原始 JSON 路径。模拟与真实模型调用明确区分。</p></section>
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><Tag tone="violet">最终证据索引 · C1-C6</Tag><h3 className="mt-4 text-2xl font-black">现场按检查项直接搜索，不在文件夹里翻找</h3></div><span className="text-xs text-slate-500">仓库根目录：大数据技术课程实践/</span></div><div className="mt-6 grid gap-3 lg:grid-cols-2">{evidenceItems.map(([title, path, note]) => <div key={path} className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div><h4 className="font-black text-slate-900">{title}</h4><p className="mt-1 text-xs leading-5 text-slate-500">{note}</p></div><div className="flex gap-2"><button onClick={() => void copy(path)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold hover:bg-slate-200">复制</button><a href={githubUrl(path)} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100">GitHub</a></div></div><code className="mt-3 block break-all rounded-lg bg-slate-950 px-3 py-2 text-[11px] text-cyan-300">{path}</code></div>)}</div></section>
    <div className="grid gap-6 lg:grid-cols-3">{[
      ["版本关系", "V1冻结 commit ebcd696 → V2.1 验收分支能力 → 当前 main 最终版本；不改写旧日志。"],
      ["失败也保留", "模型不可用或输出协议不合格时标 degraded，保存错误与兜底内容，不删除失败记录。"],
      ["人机责任", "Agent负责建议和结构化评审；规则层负责校验/降级；人工核验来源并决定是否采纳。"],
    ].map(([title, text]) => <section key={title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></section>)}</div>
  </div>;
}

export function AcceptanceCenter() {
  const [station, setStation] = useState<Station>("project");
  const active = useMemo(() => stationItems.find((item) => item.key === station)!, [station]);
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-8"><a href="/" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 font-black text-white">CL</span><span><strong className="block">ClassLoop 最终验收</strong><span className="text-xs text-slate-500">项目成果 · Agent优化 · 工程证据</span></span></a><div className="hidden text-right text-xs text-slate-500 sm:block"><strong className="text-slate-800">当前站点：{active.title}</strong><br />建议控制在 6 分钟展示 + 2 分钟问答</div></div></header>
      <nav className="border-b border-slate-200 bg-white"><div className="mx-auto grid max-w-[1500px] gap-2 px-4 py-3 md:grid-cols-3 sm:px-8">{stationItems.map((item) => <button key={item.key} onClick={() => setStation(item.key)} className={`flex items-center gap-4 rounded-2xl p-4 text-left transition ${station === item.key ? "bg-slate-950 text-white shadow-lg" : "hover:bg-slate-100"}`}><span className={`text-2xl font-black ${station === item.key ? "text-cyan-300" : "text-slate-300"}`}>{item.number}</span><span><strong className="block">{item.title}</strong><span className={`text-xs ${station === item.key ? "text-slate-400" : "text-slate-500"}`}>{item.score} · {item.subtitle}</span></span></button>)}</div></nav>
      <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-8 sm:py-10">{station === "project" && <ProjectStation />}{station === "agent" && <AgentStation />}{station === "evidence" && <EvidenceStation />}</main>
      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500">ClassLoop Agent V2.1 · 评分参考框架不是官方成绩 · 未验证内容始终标注为假设或模拟</footer>
      <Toaster richColors position="top-center" />
    </div>
  );
}
