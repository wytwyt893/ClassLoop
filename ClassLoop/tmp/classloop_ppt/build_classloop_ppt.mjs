import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const SKILL_DIR = "C:/Users/86185/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations";
const TMP_DIR = "C:/Users/86185/Desktop/2026-2027/大数据技术课程实践/tmp/classloop_ppt";
const OUT_DIR = "C:/Users/86185/Desktop/2026-2027/大数据技术课程实践/output";
const FINAL = path.join(OUT_DIR, "ClassLoop_项目简介_8页.pptx");
await fs.mkdir(TMP_DIR, { recursive: true });
await fs.mkdir(OUT_DIR, { recursive: true });
const { resolvePresentationFont, finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href);
const font = resolvePresentationFont({ preferredFamily: "Microsoft YaHei" });
const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });

const C = { navy: "#102A43", blue: "#1769AA", cyan: "#0EA5A8", teal: "#0F766E", ink: "#17324D", muted: "#5B7083", pale: "#F4F8FB", line: "#D7E3EC", white: "#FFFFFF", orange: "#E58A2B", green: "#168A63", red: "#C94C4C" };
const slideW = 1280, slideH = 720;

function box(slide, x, y, w, h, fill = "none", line = "none", radius = "roundRect") {
  return slide.shapes.add({ geometry: radius, position: { left: x, top: y, width: w, height: h }, fill, line: { fill: line, width: line === "none" ? 0 : 1 } });
}
function text(slide, value, x, y, w, h, size = 24, color = C.ink, bold = false, align = "left") {
  const s = slide.shapes.add({ geometry: "textbox", position: { left: x, top: y, width: w, height: h }, fill: "none", line: { fill: "none", width: 0 } });
  s.text = value;
  s.text.style = { typeface: font, fontSize: size, color, bold, autoFit: "shrink", align, verticalAlign: "mid" };
  return s;
}
function line(slide, x1, y1, x2, y2, color = C.line, width = 2) {
  const left = Math.min(x1, x2), top = Math.min(y1, y2);
  slide.shapes.add({ geometry: "line", position: { left, top, width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) }, line: { fill: color, width } });
}
function header(slide, kicker, title, page) {
  text(slide, kicker.toUpperCase(), 72, 36, 500, 24, 14, C.cyan, true);
  text(slide, title, 72, 68, 1040, 58, 34, C.navy, true);
  text(slide, String(page).padStart(2, "0"), 1160, 42, 48, 26, 14, C.muted, true, "right");
  line(slide, 72, 142, 1208, 142, C.line, 1);
}
function notes(slide, value) { slide.speakerNotes.textFrame.setText(value); }

// 1 Cover
{
  const s = p.slides.add(); s.background.fill = C.pale;
  box(s, 72, 72, 1136, 560, C.white, C.line);
  box(s, 72, 72, 14, 560, C.cyan, C.cyan, "rect");
  text(s, "CLASSLOOP", 126, 132, 350, 34, 18, C.cyan, true);
  text(s, "认知反馈课堂", 126, 185, 760, 78, 54, C.navy, true);
  text(s, "把“教师讲到哪一页”与“学生哪里没听懂”连接起来", 130, 285, 800, 46, 24, C.ink, false);
  text(s, "大数据技术课程实践 · 项目简介", 130, 544, 600, 30, 16, C.muted, false);
  // Editable teaching loop visual
  const nodes = [
    [880, 200, "教师\n讲解页", C.blue], [1030, 300, "学生\n看同页", C.cyan], [880, 440, "即时\n反馈", C.orange], [730, 300, "教师\n调整", C.teal],
  ];
  for (const [x, y, label, color] of nodes) { box(s, x, y, 120, 78, color, color); text(s, label, x, y + 12, 120, 54, 18, C.white, true, "center"); }
  line(s, 1000, 240, 1030, 300, C.cyan, 3); line(s, 1030, 378, 940, 440, C.cyan, 3); line(s, 880, 440, 790, 378, C.cyan, 3); line(s, 790, 300, 880, 240, C.cyan, 3);
  notes(s, "来源：ClassLoop/README.md；ClassLoop/项目交接与进度说明_2026-09-03.md。封面只概括当前产品定位，不宣称已验证教学效果。");
}

// 2 Problem
{
  const s = p.slides.add(); s.background.fill = C.white; header(s, "01 · 项目定位", "课堂里真正缺的不是题目，而是反馈位置", 2);
  text(s, "传统课堂反馈", 88, 190, 300, 32, 20, C.muted, true);
  text(s, "有人没听懂", 88, 246, 320, 62, 34, C.navy, true);
  text(s, "但教师不一定知道：\n是哪一页、哪一段、哪一个知识点", 88, 330, 400, 86, 22, C.ink);
  box(s, 590, 184, 560, 350, C.pale, C.line);
  text(s, "课堂反馈的定位尺度", 638, 218, 450, 32, 18, C.cyan, true);
  const rows = [["课堂整体", "知道有人不理解", C.muted], ["题目层面", "知道哪道题答错", C.blue], ["课件页级", "知道当前讲到哪一页卡住", C.cyan]];
  rows.forEach(([a, b, color], i) => { const y = 286 + i * 76; box(s, 640, y, 160, 48, color, color); text(s, a, 640, y + 7, 160, 34, 17, C.white, true, "center"); text(s, b, 835, y + 7, 260, 34, 18, C.ink, i === 2); });
  text(s, "项目边界", 88, 566, 160, 28, 16, C.cyan, true);
  text(s, "面向同步理论课堂的教师与当前课堂学生，不替代教师，也不把演示数据当作教学效果证据。", 240, 560, 870, 42, 17, C.muted);
  notes(s, "事实依据：ClassLoop 当前三端功能和页级反馈代码。项目痛点与价值属于待验证假设，汇报时不应描述为大规模调研结论。");
}

// 3 Scenario
{
  const s = p.slides.add(); s.background.fill = C.pale; header(s, "02 · 使用场景", "一节数据结构课里的实时反馈闭环", 3);
  const steps = [
    ["01", "教师上传课件", "PDF/PPTX 进入课堂，系统记录课件页"],
    ["02", "教师控制页码", "上一页、输入页码、下一页，统一共享状态"],
    ["03", "学生跟随反馈", "学生看到同一页，匿名点击“这里没听懂”"],
    ["04", "教师即时调整", "当前页上方出现反馈数量，决定重讲或复测"],
  ];
  steps.forEach(([n, title, desc], i) => {
    const x = 82 + i * 285;
    box(s, x, 214, 238, 260, C.white, C.line);
    text(s, n, x + 22, 236, 70, 42, 28, C.cyan, true);
    text(s, title, x + 22, 298, 194, 34, 22, C.navy, true);
    text(s, desc, x + 22, 354, 194, 80, 17, C.muted);
    if (i < 3) { text(s, "→", x + 247, 314, 32, 32, 26, C.cyan, true, "center"); }
  });
  box(s, 82, 548, 1096, 66, C.navy, C.navy);
  text(s, "核心任务：让教师在讲解过程中，定位并处理学生的理解障碍。", 112, 565, 1030, 32, 22, C.white, true, "center");
  notes(s, "来源：ClassLoop/frontend/src/components/LearningMaterialPanel.tsx；StudentPageFeedback.tsx；ParticipantView.tsx。页面展示的是已实现的课堂交互链路。");
}

// 4 Product demo
{
  const s = p.slides.add(); s.background.fill = C.white; header(s, "03 · 产品界面", "教师控制一页，学生跟随一页", 4);
  box(s, 72, 184, 1136, 390, C.pale, C.line);
  text(s, "教师端", 110, 214, 150, 30, 18, C.blue, true);
  box(s, 110, 260, 1060, 76, C.white, C.line);
  box(s, 166, 278, 130, 42, C.white, C.line); text(s, "上一页", 166, 282, 130, 32, 17, C.ink, true, "center");
  box(s, 498, 274, 188, 50, C.white, C.cyan); text(s, "12 / 107", 498, 283, 188, 32, 22, C.cyan, true, "center");
  box(s, 888, 278, 130, 42, C.white, C.line); text(s, "下一页", 888, 282, 130, 32, 17, C.ink, true, "center");
  text(s, "输入页码可随机访问，页码是课堂共享状态", 350, 366, 580, 28, 17, C.muted, false, "center");
  box(s, 110, 414, 1060, 112, C.white, C.line); text(s, "原始 PDF 页面", 138, 434, 240, 28, 18, C.navy, true); text(s, "教师端控制页码，学生端不再自由滚动，避免视角错位。", 138, 476, 900, 28, 17, C.muted);
  box(s, 72, 604, 1136, 54, "#E8F8F4", "#B8E7D8"); text(s, "学生反馈绑定当前课件页，而不是脱离上下文的孤立问卷。", 104, 617, 1070, 26, 18, C.teal, true, "center");
  notes(s, "来源：ClassLoop/frontend/src/components/LearningMaterialPanel.tsx；PresentationPage.tsx；StudentPageFeedback.tsx。界面描述基于当前实现，不代表 PPTX 原页渲染已完整支持。");
}

// 5 Architecture
{
  const s = p.slides.add(); s.background.fill = C.pale; header(s, "04 · 技术架构", "业务事实、教学结构与实时事件分层保存", 5);
  const layers = [
    ["前端", "React + TypeScript + Vite + Tailwind CSS", C.blue],
    ["后端", "Python + FastAPI + Uvicorn", C.cyan],
    ["业务数据", "SQLite：课堂、回答、反馈、原始课件", C.teal],
    ["结构关系", "Neo4j：课件—页面—文本块—关键词", C.orange],
    ["实时通信", "SSE：页码、广播、反馈事件", C.navy],
  ];
  layers.forEach(([a, b, color], i) => { const y = 178 + i * 82; box(s, 110, y, 180, 54, color, color); text(s, a, 110, y + 10, 180, 32, 18, C.white, true, "center"); box(s, 330, y, 820, 54, C.white, C.line); text(s, b, 364, y + 10, 750, 32, 19, C.ink, i === 3); if (i < 4) text(s, "↓", 192, y + 56, 18, 24, 18, C.muted, true, "center"); });
  text(s, "关键设计", 110, 615, 130, 24, 16, C.cyan, true); text(s, "Neo4j 是结构关系层，不承担账号与课堂业务事实；AI 通过 VentureAgent HTTP Adapter 接入。", 246, 610, 900, 32, 17, C.muted);
  notes(s, "来源：ClassLoop/backend/app/main.py；database.py；document_graph.py；backend/README.md。VentureAgent 为辅助工具，不是最终验收主体。");
}

// 6 Innovation
{
  const s = p.slides.add(); s.background.fill = C.white; header(s, "05 · 核心创新", "把反馈尺度细化到课件页，并保持与讲解进度同步", 6);
  const cards = [
    ["页级定位", "学生反馈自动绑定当前课件页，教师知道问题发生在哪里。", C.cyan],
    ["共享页码", "教师端页码是唯一控制源，学生端跟随显示，减少视角错位。", C.blue],
    ["结构化上下文", "课件被拆成文档、页面、文本块和关键词，为后续诊断提供上下文。", C.orange],
    ["教师保留决策权", "AI 只提供可能误区、依据和复测建议，发布前仍需教师核验。", C.teal],
  ];
  cards.forEach(([title, desc, color], i) => { const x = 92 + (i % 2) * 550, y = 190 + Math.floor(i / 2) * 180; box(s, x, y, 490, 132, C.pale, C.line); box(s, x, y, 10, 132, color, color, "rect"); text(s, title, x + 34, y + 24, 390, 30, 22, C.navy, true); text(s, desc, x + 34, y + 66, 410, 48, 17, C.muted); });
  box(s, 92, 572, 1040, 64, C.navy, C.navy); text(s, "我们做的不是“另一个投票工具”，而是一个可定位的课堂反馈闭环。", 120, 588, 980, 28, 21, C.white, true, "center");
  notes(s, "创新表述基于当前功能机制，属于方案差异判断，不宣称对所有竞品的全面优越性。依据：ClassLoop README 与当前前后端实现。");
}

// 7 Progress and boundaries
{
  const s = p.slides.add(); s.background.fill = C.pale; header(s, "06 · 当前进度", "已经跑通课堂原型，但仍有明确边界", 7);
  const done = ["三端角色与权限隔离", "课堂创建、作答与 SSE", "PDF/PPTX 解析与 Neo4j 图谱", "教师控制页码、学生同步显示", "学生页级反馈与教师实时统计", "Agent 诊断接口与基线留痕表"];
  const next = ["T1/T2/T3 首次基线原始证据", "至少 5 个真实问题案例", "统一清理前端历史乱码", "管理员原生图谱可视化", "PPTX 原始页渲染与 OCR"];
  text(s, "已实现", 96, 182, 300, 30, 22, C.green, true); done.forEach((v, i) => { const y = 232 + i * 48; text(s, "✓", 100, y, 26, 26, 18, C.green, true); text(s, v, 136, y, 400, 28, 17, C.ink); });
  text(s, "待补齐", 680, 182, 300, 30, 22, C.orange, true); next.forEach((v, i) => { const y = 232 + i * 52; text(s, "○", 684, y, 26, 26, 18, C.orange, true); text(s, v, 720, y, 440, 28, 17, C.ink); });
  box(s, 96, 566, 1060, 66, C.white, C.line); text(s, "诚信边界：当前演示数据不是教学效果证据，Agent 输出仍需人工核验。", 124, 584, 1000, 28, 19, C.red, true, "center");
  notes(s, "当前进度依据：ClassLoop/README.md；ClassLoop/项目交接与进度说明_2026-09-03.md；ClassLoop/evidence/v1_freeze/S01_freeze_gate.md。已实现与待补齐严格区分。");
}

// 8 Next steps
{
  const s = p.slides.add(); s.background.fill = C.white; header(s, "07 · 下一步", "下一阶段先补证据，再做智能化增强", 8);
  const items = [
    ["1", "冻结并运行 V1", "保留版本、模型、Prompt、知识库、工具、环境和失败记录", C.blue],
    ["2", "完成 T1/T2/T3", "分别完成理论学习、项目指导、项目评审首次基线", C.cyan],
    ["3", "整理问题案例", "从真实运行中形成至少 5 个可复现案例，覆盖至少 2 个流程", C.orange],
    ["4", "再进入 V2", "围绕真实问题修复 Agent 路由、输出格式和证据标注", C.teal],
  ];
  items.forEach(([n, title, desc, color], i) => { const y = 176 + i * 104; box(s, 100, y, 72, 60, color, color); text(s, n, 100, y + 12, 72, 34, 24, C.white, true, "center"); text(s, title, 210, y + 2, 300, 30, 22, C.navy, true); text(s, desc, 210, y + 38, 820, 28, 17, C.muted); if (i < 3) line(s, 135, y + 62, 135, y + 104, C.line, 2); });
  box(s, 100, 602, 1060, 54, C.navy, C.navy); text(s, "阶段目标：用可追溯证据证明 ClassLoop 的课堂反馈机制，再评估 AI 是否真正提升教师判断。", 126, 616, 1008, 26, 18, C.white, true, "center");
  notes(s, "下一步安排依据：第一阶段提交说明.pdf 的 G1-G5 门槛，以及 ClassLoop/evidence/v1_freeze/S01_freeze_gate.md。此页不承诺未完成的实验结果。");
}

const candidate = path.join(TMP_DIR, "candidate.pptx");
await (await PresentationFile.exportPptx(p)).save(candidate);
const requirements = { explicitTotalSlideCount: 8, requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [] };
const finalResult = await finalizePresentation({
  ...requirements,
  workspaceDir: "C:/Users/86185/Desktop/2026-2027/大数据技术课程实践",
  candidatePath: candidate,
  finalPath: FINAL,
  pythonExecutable: "C:/Users/86185/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-heading-fit"],
  fontPolicy: { basis: "design", families: [font] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(TMP_DIR, "validation.json"),
});
console.log(JSON.stringify(finalResult, null, 2));
