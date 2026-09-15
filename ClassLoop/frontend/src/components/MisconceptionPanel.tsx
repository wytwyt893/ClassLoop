import { toast } from "sonner";
import type { LocalElement, LocalResponse } from "../services/types";

interface MisconceptionPanelProps {
  elements: LocalElement[];
  responses: LocalResponse[];
  totalParticipants: number;
}

export function MisconceptionPanel({ elements, responses, totalParticipants }: MisconceptionPanelProps) {
  const bstQuestion = elements.find((element) => element._id === "element_bst_complexity") ?? elements[0];
  const correctIds = new Set(bstQuestion?.choices?.filter((choice) => choice.isCorrect).map((choice) => choice.id) ?? []);
  const affected = new Set(
    responses
      .filter((response) => response.elementId === bstQuestion?._id)
      .filter((response) => !(response.choiceIds ?? []).some((choiceId) => correctIds.has(choiceId)))
      .map((response) => response.participantId),
  ).size;
  const denominator = Math.max(totalParticipants, 1);
  const percentage = Math.round((affected / denominator) * 100);

  const pending = (action: string) => toast.info(`${action}已进入课堂流程；下一阶段将接入 AI 教学干预服务。`);

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white">Top Misconception</span>
            <span className="text-xs font-semibold text-amber-700">本地规则分析</span>
          </div>
          <h2 className="mt-3 text-xl font-black text-slate-900">认为 BST 查找复杂度始终为 O(log n)</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">证据来自数据库中的课堂作答；当前按规则聚合，下一阶段将结合学生提问进行语义归并。</p>
        </div>
        <div className="min-w-32 rounded-2xl bg-white px-5 py-4 text-center shadow-sm ring-1 ring-amber-100">
          <p className="text-3xl font-black text-amber-600">{affected}<span className="text-base text-slate-400"> / {totalParticipants}</span></p>
          <p className="mt-1 text-xs font-semibold text-slate-500">影响学生 · {percentage}%</p>
        </div>
      </div>
      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-700">BST</span>
          <span className="py-2 text-slate-300">→</span>
          <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-700">Tree Height</span>
          <span className="py-2 text-slate-300">→</span>
          <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-700">Search Complexity</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => pending("广播反例")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">广播反例</button>
          <button onClick={() => pending("重新解释")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">重新解释</button>
          <button onClick={() => pending("变式复测")} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700">立即复测</button>
        </div>
      </div>
    </section>
  );
}
