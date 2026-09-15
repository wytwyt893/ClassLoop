import { useState } from "react";
import { api, useMutation } from "../services/dataProvider";
import { toast } from "sonner";

type StudentAiTutorPanelProps = {
  sessionId: string;
  participantId: string;
  presentation: any;
};

export function StudentAiTutorPanel({ sessionId, participantId, presentation }: StudentAiTutorPanelProps) {
  const explain = useMutation(api.agent.explainCurrentPage);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const submit = async () => {
    if (question.trim().length < 2) {
      toast.error("请先写下你对当前页的具体问题");
      return;
    }
    setLoading(true);
    try {
      const response = await explain({ sessionId, participantId, question: question.trim() });
      setResult(response);
      toast.success("已基于课件证据生成讲解");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI 讲解暂不可用");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-100">Evidence Tutor · 学习辅导 Agent</p>
            <h2 className="mt-1 text-lg font-black">对当前课件页追问</h2>
          </div>
          {presentation && <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">第 {presentation.pageNumber} 页</span>}
        </div>
        <p className="mt-2 text-xs leading-5 text-violet-100">回答只检索当前页及相邻页，并显示 [E1] 等来源编号，不会把无来源内容说成事实。</p>
      </div>
      <div className="p-4 sm:p-5">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={!presentation || loading}
          rows={3}
          maxLength={1000}
          placeholder={presentation ? "例如：这一页的核心概念是什么？为什么这个例子成立？" : "教师选择课件页后即可追问"}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-400">不会上传学生昵称、头像或个人答案</span>
          <button type="button" onClick={() => void submit()} disabled={!presentation || loading} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
            {loading ? "正在检索课件并生成…" : "让 AI 按证据讲解"}
          </button>
        </div>

        {result && (
          <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50 p-4">
            <div className="flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="rounded-full bg-white px-2.5 py-1 text-violet-700">{result.agent}</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-slate-600">{result.mode === "live_model_cache" ? "缓存复用" : result.mode === "live_model" ? "DeepSeek 实时生成" : "结构化降级"}</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-slate-600">{result.retrieval?.hits?.length || 0} 条证据</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-slate-600">{Math.round(result.performance?.totalMs || 0)} ms</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.reply}</p>
            {!!result.retrieval?.hits?.length && (
              <details className="mt-4 border-t border-violet-100 pt-3">
                <summary className="cursor-pointer text-xs font-black text-violet-700">查看引用证据与原始定位</summary>
                <div className="mt-3 space-y-2">
                  {result.retrieval.hits.map((hit: any) => (
                    <div key={`${hit.citation}-${hit.id}`} className="rounded-lg bg-white p-3 text-xs leading-5 text-slate-600">
                      <p className="font-black text-slate-800">{hit.citation} {hit.title}</p>
                      <p className="mt-1 text-violet-600">{hit.locator} · 匹配分 {hit.score}</p>
                      <p className="mt-1">{hit.excerpt}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
            <p className="mt-3 text-[11px] text-slate-500">run_id：{result.runId} · {result.notice}</p>
          </div>
        )}
      </div>
    </section>
  );
}
