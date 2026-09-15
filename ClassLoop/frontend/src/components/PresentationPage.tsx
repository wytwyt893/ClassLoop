type PresentationPageProps = {
  presentation: any;
  compact?: boolean;
};

/** Render the original uploaded PDF page when the browser can display PDFs.
 * Text extraction remains below it as an accessible/searchable fallback.
 */
export function PresentationPage({ presentation, compact = false }: PresentationPageProps) {
  if (!presentation?.fileUrl || presentation.documentType !== "pdf") return null;
  const page = Number(presentation.pageNumber || 1);
  const src = `${presentation.fileUrl}#page=${page}&view=Fit`;
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm ${compact ? "" : "mt-4"}`}>
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200">
        <span>原始 PDF 页面（已锁定单页）</span>
        <span>第 {page} / {presentation.pageCount || "?"} 页</span>
      </div>
      <iframe
        key={src}
        title={`${presentation.filename} 第 ${page} 页`}
        src={src}
        /* The native PDF viewer is intentionally non-interactive: page changes
         * must come from the teacher's controls above, otherwise its internal
         * scroll position can diverge from the classroom page number. */
        className="pointer-events-none block h-[min(70vh,720px)] w-full bg-white"
      />
    </div>
  );
}
