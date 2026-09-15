import { useMemo, useState } from "react";
import { api, useMutation, useQuery } from "../services/dataProvider";
import { toast } from "sonner";

type ClassroomInsightPanelProps = {
  sessionId: string;
};

export function ClassroomInsightPanel({ sessionId }: ClassroomInsightPanelProps) {
  const presentation = useQuery(api.classroom.getPresentation, { sessionId });
  const feedback = useQuery(
    api.classroom.getPageFeedback,
    presentation ? { sessionId, documentId: presentation.documentId, pageNumber: presentation.pageNumber } : { sessionId },
  ) || [];
  const agentStatus = useQuery(api.agent.getStatus, {});
  const diagnoses = useQuery(api.agent.getDiagnoses, { sessionId }) || [];
  const diagnose = useMutation(api.agent.diagnose);
  const updateFeedbackStatus = useMutation(api.classroom.updatePageFeedbackStatus);
  const [diagnosing, setDiagnosing] = useState(false);

  const counts = useMemo(() => ({
    unclear: feedback.filter((item: any) => item.category === "unclear" && item.status === "pending").length,
    tooFast: feedback.filter((item: any) => item.category === "too_fast" && item.status === "pending").length,
    questions: feedback.filter((item: any) => item.category === "question" && item.status === "pending").length,
  }), [feedback]);
  const currentDiagnosis = diagnoses.find((item: any) =>
    item.status === "completed" &&
    (!presentation || (item.documentId === presentation.documentId && item.pageNumber === presentation.pageNumber)),
  );

  const handleDiagnose = async () => {
    setDiagnosing(true);
    try {
      await diagnose({ sessionId });
      toast.success("已生成当前页课堂诊断，请人工核验后使用");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "课堂诊断失败");
    } finally {
      setDiagnosing(false);
    }
  };

  const toggleResolved = async (item: any) => {
    try {
      await updateFeedbackStatus({
        sessionId,
        feedbackId: item._id,
        status: item.status === "resolved" ? "pending" : "resolved",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "反馈状态更新失败");
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-cyan-700">课件页级认知反馈</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">
            {presentation ? `${presentation.filename} · 第 ${presentation.pageNumber} 页` : "教师尚未选择当前课件页"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">学生反馈只对教师显示，切页后统计会自动切换到对应页面。</p>
        </div>
        <button
          type="button"
          onClick={() => void handleDiagnose()}
          disabled={!presentation || !agentStatus?.configured || diagnosing}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {diagnosing ? "正在生成诊断…" : "生成当前页 AI 诊断"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="这里没听懂" value={counts.unclear} tone="rose" />
        <Metric label="讲得有点快" value={counts.tooFast} tone="amber" />
        <Metric label="具体疑问" value={counts.questions} tone="cyan" />
      </div>

      {!agentStatus?.configured && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Agent 适配器尚未配置。课堂、课件和反馈功能不受影响；如需诊断，请在后端设置
          <code className="mx-1 rounded bg-white px-1.5 py-0.5">CLASSLOOP_AGENT_BASE_URL</code>
          并启动外部 VentureAgent 服务。
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-black text-slate-800">当前页学生反馈</h3>
          <div className="mt-3 max-h-80 space-y-2 overflow-auto pr-1">
            {feedback.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">当前页还没有学生反馈。</p>}
            {feedback.map((item: any) => (
              <button
                type="button"
                key={item._id}
                onClick={() => void toggleResolved(item)}
                className={`w-full rounded-xl border p-3 text-left transition ${item.status === "resolved" ? "border-slate-200 bg-slate-50 opacity-60" : "border-cyan-100 bg-cyan-50 hover:border-cyan-300"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-800">{item.avatar} {item.displayName}</span>
                  <span className="text-xs font-bold text-cyan-700">{item.categoryLabel}</span>
                </div>
                {item.message && <p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p>}
                <p className="mt-2 text-[11px] text-slate-400">{item.status === "resolved" ? "已处理，点击恢复" : "点击标记为已处理"}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-800">最近一次当前页诊断</h3>
          {currentDiagnosis?.output?.analysisText ? (
            <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{currentDiagnosis.output.analysisText}</p>
              <p className="mt-4 border-t border-indigo-100 pt-3 text-xs font-bold text-indigo-700">
                {currentDiagnosis.output.notice || "AI生成，仅供教师参考；发布前必须人工核验。"}
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              暂无当前页诊断。系统只会把课件页、匿名反馈和课堂回答发送给外部 Agent，不发送学生昵称或头像。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "rose" | "amber" | "cyan" }) {
  const styles = {
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <p className="text-xs font-bold">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}
