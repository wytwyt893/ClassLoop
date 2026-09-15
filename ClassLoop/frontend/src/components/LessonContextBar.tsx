export function LessonContextBar({ sessionCode }: { sessionCode: string }) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-sm font-black text-white">DS</span>
          <div>
            <p className="font-bold text-slate-900">数据结构</p>
          </div>
        </div>
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
        <div>
          <p className="text-xs text-slate-500">章节</p>
          <p className="text-sm font-semibold text-slate-800">树 / BST / AVL</p>
        </div>
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">当前知识点</p>
          <p className="truncate text-sm font-semibold text-slate-800">树高与查找复杂度</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-600">#{sessionCode}</span>
      </div>
    </div>
  );
}
