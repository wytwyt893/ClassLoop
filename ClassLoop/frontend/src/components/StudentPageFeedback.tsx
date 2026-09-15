import { useEffect, useMemo, useState } from "react";
import { api, useMutation, useQuery } from "../services/dataProvider";
import { toast } from "sonner";
import { PresentationPage } from "./PresentationPage";

type StudentPageFeedbackProps = {
  sessionId: string;
  participantId: string;
  presentation: any;
};

const quickFeedback = [
  { category: "unclear", label: "这里没听懂", icon: "？" },
  { category: "too_fast", label: "讲得有点快", icon: "⏱" },
] as const;

export function StudentPageFeedback({ sessionId, participantId, presentation }: StudentPageFeedbackProps) {
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const submitFeedback = useMutation(api.classroom.submitPageFeedback);
  const myFeedback = useQuery(
    api.classroom.getMyPageFeedback,
    presentation ? { sessionId, participantId } : "skip",
  ) || [];

  useEffect(() => setQuestion(""), [presentation?.documentId, presentation?.pageNumber]);

  const sentCategories = useMemo(() => new Set(
    myFeedback
      .filter((item: any) => item.documentId === presentation?.documentId && item.pageNumber === presentation?.pageNumber)
      .map((item: any) => item.category),
  ), [myFeedback, presentation?.documentId, presentation?.pageNumber]);

  if (!presentation) {
    return (
      <div className="mb-5 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-4 text-sm text-slate-500">
        教师尚未同步课件页。你可以先完成课堂问题，课件开始后这里会自动更新。
      </div>
    );
  }

  const send = async (category: "unclear" | "too_fast" | "question", message = "") => {
    setSending(category);
    try {
      await submitFeedback({
        sessionId,
        participantId,
        documentId: presentation.documentId,
        pageNumber: presentation.pageNumber,
        category,
        message,
      });
      if (category === "question") setQuestion("");
      toast.success("反馈已私下发送给教师");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "反馈发送失败");
    } finally {
      setSending(null);
    }
  };

  return (
    <section className="mb-5 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.16em] text-cyan-700">正在跟随教师课件</p>
          <h2 className="mt-1 text-lg font-black text-slate-900">{presentation.filename} · 第 {presentation.pageNumber} / {presentation.pageCount} 页</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">{presentation.pageTitle || "当前讲解页"}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-cyan-700 shadow-sm">仅教师可见反馈</span>
      </div>

      <PresentationPage presentation={presentation} compact />

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {quickFeedback.map((item) => (
          <button
            key={item.category}
            type="button"
            onClick={() => void send(item.category)}
            disabled={sending !== null}
            className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${sentCategories.has(item.category) ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700 hover:border-cyan-400"} disabled:opacity-60`}
          >
            <span className="mr-2">{item.icon}</span>{sentCategories.has(item.category) ? `${item.label} · 已反馈` : item.label}
          </button>
        ))}
      </div>

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => { event.preventDefault(); if (question.trim()) void send("question", question.trim()); }}
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value.slice(0, 500))}
          placeholder="我对这一页还有一个具体问题…"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
        />
        <button disabled={!question.trim() || sending !== null} className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-50">
          {sending === "question" ? "发送中…" : "私下提问"}
        </button>
      </form>
    </section>
  );
}
