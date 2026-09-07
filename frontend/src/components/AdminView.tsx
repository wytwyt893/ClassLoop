import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import { api, useAuthActions, useQuery, useQueryState } from "../services/dataProvider";
import { SignOutButton } from "../SignOutButton";

export function AdminSignIn() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const data = new FormData(event.currentTarget);
      data.set("flow", "signIn");
      await signIn("password", data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "管理员登录失败");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <a href="/" className="text-sm font-bold text-violet-300">← 返回三入口主页</a>
        <div className="mt-10 rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-4xl">🗄️</span>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Administrator</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">数据库管理视图</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">统一查看 SQLite 业务数据与 Neo4j 课件知识图谱；页面只读，不显示密码哈希。</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block"><span className="text-sm font-bold text-slate-700">管理员邮箱</span><input name="email" type="email" required className="auth-input-field mt-2" placeholder="admin@classloop.local" /></label>
            <label className="block"><span className="text-sm font-bold text-slate-700">密码</span><input name="password" type="password" required className="auth-input-field mt-2" placeholder="管理员密码" /></label>
            <button disabled={submitting} className="w-full rounded-xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-50">{submitting ? "正在验证…" : "进入只读管理视图"}</button>
          </form>
          <div className="mt-6 rounded-xl bg-violet-50 p-4 text-xs text-violet-900"><strong>本机演示管理员</strong><br />admin@classloop.local<br />classloop-admin</div>
        </div>
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}

const questionLabels: Record<string, string> = {
  single_choice: "单选", single_choice_unique: "单选", multiple_choice: "多选",
  text_input: "文本", number_input: "数值", file_upload: "文件",
};

type GraphNode = {
  id: string;
  type: "Session" | "Document" | "Page" | "Chunk" | "Keyword" | string;
  label: string;
  properties?: Record<string, any>;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  properties?: Record<string, any>;
};

const nodeStyle: Record<string, { fill: string; stroke: string; name: string }> = {
  Session: { fill: "#ede9fe", stroke: "#7c3aed", name: "课堂" },
  Document: { fill: "#dbeafe", stroke: "#2563eb", name: "课件" },
  Page: { fill: "#ccfbf1", stroke: "#0f766e", name: "页面" },
  Chunk: { fill: "#fef3c7", stroke: "#d97706", name: "文本块" },
  Keyword: { fill: "#fce7f3", stroke: "#db2777", name: "关键词" },
};

function shortLabel(value: string, limit = 14) {
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function GraphCanvas({ graph, pageNumber }: { graph: { nodes: GraphNode[]; edges: GraphEdge[] }; pageNumber: number }) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const visible = useMemo(() => {
    const allNodes = graph.nodes || [];
    const allEdges = graph.edges || [];
    if (pageNumber === 0) {
      const nodes = allNodes.filter((node) => ["Session", "Document", "Page"].includes(node.type));
      const ids = new Set(nodes.map((node) => node.id));
      return { nodes, edges: allEdges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)) };
    }
    const page = allNodes.find((node) => node.type === "Page" && Number(node.properties?.pageNumber) === pageNumber);
    if (!page) return { nodes: [], edges: [] };
    const chunkIds = new Set(allEdges.filter((edge) => edge.type === "HAS_CHUNK" && edge.source === page.id).map((edge) => edge.target));
    const keywordIds = new Set(allEdges.filter((edge) => edge.type === "MENTIONS" && chunkIds.has(edge.source)).map((edge) => edge.target));
    const nodes = allNodes.filter((node) => node.type === "Document" || node.type === "Session" || node.id === page.id || chunkIds.has(node.id) || keywordIds.has(node.id));
    const ids = new Set(nodes.map((node) => node.id));
    return { nodes, edges: allEdges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)) };
  }, [graph, pageNumber]);

  useEffect(() => setSelectedNode(null), [pageNumber, graph]);

  const groups = ["Session", "Document", "Page", "Chunk", "Keyword"];
  const groupedNodes = new Map(groups.map((type) => [
    type,
    visible.nodes
      .filter((node) => node.type === type)
      .sort((a, b) => Number(a.properties?.pageNumber || a.properties?.chunkIndex || 0) - Number(b.properties?.pageNumber || b.properties?.chunkIndex || 0)),
  ]));
  const pageColumns = pageNumber === 0 ? 4 : 1;
  const keywordColumns = 2;
  const pageRows = Math.ceil((groupedNodes.get("Page")?.length || 0) / pageColumns);
  const chunkRows = groupedNodes.get("Chunk")?.length || 0;
  const keywordRows = Math.ceil((groupedNodes.get("Keyword")?.length || 0) / keywordColumns);
  const height = Math.max(560, Math.max(pageRows, chunkRows, keywordRows) * 66 + 100);
  const positions = new Map<string, { x: number; y: number }>();
  const centerY = height / 2;
  groupedNodes.get("Session")?.forEach((node) => positions.set(node.id, { x: 90, y: centerY }));
  groupedNodes.get("Document")?.forEach((node) => positions.set(node.id, { x: 270, y: centerY }));
  if (pageNumber === 0) {
    groupedNodes.get("Page")?.forEach((node, index) => {
      const column = index % pageColumns;
      const row = Math.floor(index / pageColumns);
      positions.set(node.id, { x: 490 + column * 180, y: 65 + row * 66 });
    });
  } else {
    groupedNodes.get("Page")?.forEach((node) => positions.set(node.id, { x: 450, y: centerY }));
    const chunks = groupedNodes.get("Chunk") || [];
    chunks.forEach((node, index) => positions.set(node.id, { x: 650, y: ((index + 1) * height) / (chunks.length + 1) }));
    const keywords = groupedNodes.get("Keyword") || [];
    keywords.forEach((node, index) => {
      const column = index % keywordColumns;
      const row = Math.floor(index / keywordColumns);
      const rows = Math.ceil(keywords.length / keywordColumns);
      const rowY = ((row + 1) * height) / (rows + 1);
      positions.set(node.id, { x: 860 + column * 180, y: rowY });
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {Object.entries(nodeStyle).map(([type, style]) => <span key={type} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: style.stroke }} />{style.name}</span>)}
        <span className="ml-auto text-xs text-slate-500">当前显示 {visible.nodes.length} 个节点 / {visible.edges.length} 条关系</span>
      </div>
      <div className="overflow-auto bg-white">
        <svg viewBox={`0 0 1120 ${height}`} className="min-h-[560px] min-w-[960px] w-full" role="img" aria-label="Neo4j 课件知识图谱">
          <defs><marker id="graph-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#94a3b8" /></marker></defs>
          {visible.edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#cbd5e1" strokeWidth="1.4" markerEnd="url(#graph-arrow)"><title>{edge.type}</title></line>;
          })}
          {visible.nodes.map((node) => {
            const position = positions.get(node.id);
            if (!position) return null;
            const style = nodeStyle[node.type] || { fill: "#f1f5f9", stroke: "#64748b", name: node.type };
            const active = selectedNode?.id === node.id;
            return (
              <g key={node.id} transform={`translate(${position.x - 72}, ${position.y - 23})`} onClick={() => setSelectedNode(node)} className="cursor-pointer">
                <rect width="144" height="46" rx="12" fill={style.fill} stroke={style.stroke} strokeWidth={active ? 3 : 1.5} />
                <text x="72" y="19" textAnchor="middle" fontSize="10" fontWeight="700" fill={style.stroke}>{style.name}</text>
                <text x="72" y="34" textAnchor="middle" fontSize="11" fill="#0f172a">{shortLabel(String(node.label || node.id))}</text>
                <title>{node.label}</title>
              </g>
            );
          })}
        </svg>
      </div>
      {selectedNode && <div className="border-t border-slate-200 bg-slate-50 p-4 text-sm"><div className="flex flex-wrap items-center gap-2"><strong>{nodeStyle[selectedNode.type]?.name || selectedNode.type}</strong><span className="text-slate-700">{selectedNode.label}</span><code className="rounded bg-white px-2 py-1 text-xs text-slate-500">{selectedNode.id}</code></div>{selectedNode.properties?.text && <p className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 leading-6 text-slate-600">{selectedNode.properties.text}</p>}</div>}
    </div>
  );
}

function RelationalDatabasePanel() {
  const overview = useQuery(api.admin.getOverview) as any;
  const [tab, setTab] = useState<"teachers" | "classes" | "questions">("teachers");
  const cards = overview ? [
    ["教师账号", overview.counts.teachers, "👩‍🏫"], ["课堂", overview.counts.classes, "🏫"],
    ["题目", overview.counts.questions, "📝"], ["回答", overview.counts.responses, "💬"],
    ["课件", overview.counts.documents, "📚"], ["页级反馈", overview.counts.pageFeedback || 0, "🙋"],
    ["Agent诊断", overview.counts.agentDiagnoses || 0, "🧠"], ["临时在线", overview.counts.liveParticipants, "🟢"],
  ] : [];
  if (!overview) return <div className="rounded-2xl bg-white p-10 text-center text-slate-500">正在读取 SQLite 数据库…</div>;
  return <>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">{cards.map(([name, value, icon]) => <div key={String(name)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="text-2xl">{icon}</span><p className="mt-4 text-3xl font-black">{value}</p><p className="mt-1 text-sm text-slate-500">{name}</p></div>)}</div>
    <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex gap-2 border-b border-slate-200 p-4">{([['teachers','教师账号'],['classes','课堂信息'],['questions','题目信息']] as const).map(([key,name]) => <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === key ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{name}</button>)}</div>
      <div className="overflow-x-auto">
        {tab === "teachers" && <table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">教师</th><th className="p-4">唯一邮箱</th><th className="p-4">课堂数</th><th className="p-4">创建时间</th></tr></thead><tbody>{overview.teachers.map((row:any) => <tr key={row.id} className="border-t border-slate-100"><td className="p-4 font-bold">{row.name}</td><td className="p-4 font-mono text-xs">{row.email}</td><td className="p-4">{row.classCount}</td><td className="p-4 text-slate-500">{new Date(row.createdAt).toLocaleString()}</td></tr>)}</tbody></table>}
        {tab === "classes" && <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">课堂</th><th className="p-4">课堂码</th><th className="p-4">教师</th><th className="p-4">题目</th><th className="p-4">回答</th><th className="p-4">状态</th></tr></thead><tbody>{overview.classes.map((row:any) => <tr key={row.id} className="border-t border-slate-100"><td className="p-4 font-bold">{row.title}</td><td className="p-4 font-mono">{row.sessionCode}</td><td className="p-4"><span className="font-semibold">{row.teacherName}</span><br /><span className="text-xs text-slate-500">{row.teacherEmail}</span></td><td className="p-4">{row.questionCount}</td><td className="p-4">{row.responseCount}</td><td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{row.isActive ? "开放" : "暂停"}</span></td></tr>)}</tbody></table>}
        {tab === "questions" && <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">题目</th><th className="p-4">所属课堂</th><th className="p-4">类型</th><th className="p-4">回答数</th><th className="p-4">状态</th></tr></thead><tbody>{overview.questions.map((row:any) => <tr key={row.id} className="border-t border-slate-100"><td className="max-w-md p-4 font-semibold">{row.title}</td><td className="p-4">{row.classTitle}<br /><span className="font-mono text-xs text-slate-500">#{row.sessionCode}</span></td><td className="p-4">{questionLabels[row.type] || row.type}</td><td className="p-4">{row.responseCount}</td><td className="p-4">{row.isActive ? "启用" : "停用"}</td></tr>)}</tbody></table>}
      </div>
    </div>
  </>;
}

function KnowledgeGraphPanel() {
  const graphStatus = useQuery(api.admin.getGraphStatus) as any;
  const documents = useQuery(api.admin.getDocuments) as any[] | undefined;
  const [documentId, setDocumentId] = useState("");
  const [pageNumber, setPageNumber] = useState(0);
  useEffect(() => { if (!documentId && documents?.length) setDocumentId(documents[0]._id); }, [documents, documentId]);
  const graphQuery = useQueryState(api.admin.getDocumentGraph, documentId ? { documentId } : "skip");
  const graph = graphQuery.data as { source: string; document: any; nodes: GraphNode[]; edges: GraphEdge[] } | undefined;
  const pages = (graph?.nodes || []).filter((node) => node.type === "Page").sort((a, b) => Number(a.properties?.pageNumber) - Number(b.properties?.pageNumber));
  const currentPageIndex = pages.findIndex((page) => Number(page.properties?.pageNumber) === pageNumber);
  const goToRelativePage = (offset: number) => {
    const nextIndex = pageNumber === 0 ? 0 : currentPageIndex + offset;
    const nextPage = pages[nextIndex];
    if (nextPage) setPageNumber(Number(nextPage.properties?.pageNumber));
  };
  const selectDocument = (id: string) => { setDocumentId(id); setPageNumber(0); };
  return <div className="grid gap-6 lg:grid-cols-[310px_minmax(0,1fr)]">
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between"><h2 className="font-black text-slate-900">课件图谱</h2>{graphStatus ? <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${graphStatus.connected ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{graphStatus.connected ? "Neo4j 已连接" : "Neo4j 未连接"}</span> : null}</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">列表来自 SQLite，右侧节点与关系直接读取 Neo4j。</p>
      <div className="mt-4 space-y-2">
        {!documents && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">正在读取课件…</p>}
        {documents?.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">尚未导入课件。</p>}
        {documents?.map((document) => <button key={document._id} onClick={() => selectDocument(document._id)} className={`w-full rounded-xl border p-3 text-left transition ${documentId === document._id ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:bg-slate-50"}`}><p className="line-clamp-2 text-sm font-bold text-slate-800">{document.filename}</p><p className="mt-2 text-xs text-slate-500">{document.teacherName} · {document.pageCount} 页</p><span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${document.graphStatus === "synced" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{document.graphStatus === "synced" ? "已同步" : document.graphStatus}</span></button>)}
      </div>
    </aside>
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {!documentId && <div className="p-12 text-center text-slate-500">请选择一份课件。</div>}
      {documentId && graphQuery.isLoading && <div className="p-12 text-center text-slate-500">正在从 Neo4j 读取图谱…</div>}
      {documentId && graphQuery.error && <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><strong>图谱读取失败</strong><p className="mt-2">{graphQuery.error.message}</p></div>}
      {graph && <>
        <div className="border-b border-slate-200 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Neo4j 实时查询</p><h2 className="mt-1 text-xl font-black text-slate-900">{graph.document.filename}</h2><p className="mt-2 text-xs text-slate-500">{graph.document.teacherName} · {graph.document.classTitle || "未绑定课堂"}</p></div><div className="flex gap-2 text-xs"><span className="rounded-lg bg-blue-50 px-3 py-2 font-bold text-blue-700">{graph.nodes.length} 节点</span><span className="rounded-lg bg-violet-50 px-3 py-2 font-bold text-violet-700">{graph.edges.length} 关系</span></div></div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button onClick={() => setPageNumber(0)} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${pageNumber === 0 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>课件概览</button>
            <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <button type="button" disabled={pageNumber === 0 || currentPageIndex <= 0} onClick={() => goToRelativePage(-1)} className="px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35">上一页</button>
              <span className="min-w-24 border-x border-slate-200 px-4 py-2 text-center text-sm font-black text-violet-700">{pageNumber === 0 ? `— / ${pages.length}` : `${currentPageIndex + 1} / ${pages.length}`}</span>
              <button type="button" disabled={!pages.length || (pageNumber !== 0 && currentPageIndex >= pages.length - 1)} onClick={() => goToRelativePage(1)} className="px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35">下一页</button>
            </div>
            {pageNumber > 0 && <span className="text-xs font-semibold text-slate-500">当前：第 {pageNumber} 页</span>}
          </div>
        </div>
        <GraphCanvas graph={graph} pageNumber={pageNumber} />
      </>}
    </section>
  </div>;
}

export function AdminDatabaseView() {
  const [section, setSection] = useState<"relational" | "graph">("relational");
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-800 bg-slate-950 text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5"><div><a href="/" className="text-xl font-black">ClassLoop</a><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">统一数据库管理视图</p></div><SignOutButton /></div></header>
      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black">系统数据中心</h1><p className="mt-2 text-sm text-slate-500">在同一入口查看关系业务数据与课件知识图谱，所有操作均为只读。</p></div><div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200"><button onClick={() => setSection("relational")} className={`rounded-lg px-4 py-2 text-sm font-bold ${section === "relational" ? "bg-slate-950 text-white" : "text-slate-500"}`}>关系数据库</button><button onClick={() => setSection("graph")} className={`rounded-lg px-4 py-2 text-sm font-bold ${section === "graph" ? "bg-violet-600 text-white" : "text-slate-500"}`}>Neo4j 知识图谱</button></div></div>
        <div className="mt-7">{section === "relational" ? <RelationalDatabasePanel /> : <KnowledgeGraphPanel />}</div>
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
