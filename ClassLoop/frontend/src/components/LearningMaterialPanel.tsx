import { useEffect, useRef, useState } from "react";
import { api, useApiData, useMutation, useQuery, useSessionEvents } from "../services/dataProvider";
import { toast } from "sonner";
import { PresentationPage } from "./PresentationPage";

type LearningMaterialPanelProps = {
  sessionId: string;
};

const extractionLabels: Record<string, string> = {
  extracted: "文本已提取",
  needs_ocr: "需要 OCR",
};

const graphLabels: Record<string, string> = {
  synced: "图谱已同步",
  pending: "等待同步",
  failed: "同步失败",
};

export function LearningMaterialPanel({ sessionId }: LearningMaterialPanelProps) {
  const { request, refresh } = useApiData();
  const documents = useQuery(api.documents.getDocuments, { sessionId }) || [];
  const presentation = useQuery(api.classroom.getPresentation, { sessionId });
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [switchingDocument, setSwitchingDocument] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [refreshingFeedback, setRefreshingFeedback] = useState(false);
  const [feedbackPulse, setFeedbackPulse] = useState(0);
  const autoRetriedDocumentRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setPresentation = useMutation(api.classroom.setPresentation);
  const liveEvents = useSessionEvents(sessionId);
  const currentFeedback = useQuery(
    api.classroom.getPageFeedback,
    presentation ? { sessionId, documentId: presentation.documentId, pageNumber: presentation.pageNumber } : { sessionId },
  ) || [];
  const pendingFeedback = currentFeedback.filter((item: any) => item.status === "pending");
  const feedbackCounts = pendingFeedback.reduce((counts: Record<string, number>, item: any) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, {});

  useEffect(() => {
    if (liveEvents.lastEvent?.type === "student.page_feedback") setFeedbackPulse((value) => value + 1);
  }, [liveEvents.lastEvent?.id, liveEvents.lastEvent?.type]);

  const refreshFeedback = () => {
    setRefreshingFeedback(true);
    refresh();
    window.setTimeout(() => setRefreshingFeedback(false), 450);
  };

  useEffect(() => {
    if (presentation?.documentId) {
      setSelectedDocumentId(presentation.documentId);
      setPageNumber(presentation.pageNumber || 1);
      setPageInput(String(presentation.pageNumber || 1));
    } else if (!selectedDocumentId && documents.length > 0) {
      setSelectedDocumentId(documents[0]._id);
      setPageNumber(1);
    }
  }, [presentation?.documentId, presentation?.pageNumber, documents, selectedDocumentId]);

  const detail = useQuery(
    api.documents.getDocument,
    selectedDocumentId ? { documentId: selectedDocumentId } : "skip",
  );
  const pageCount = detail?.pageCount || 0;

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const suffix = file.name.toLowerCase().split(".").pop();
    if (!suffix || !["pdf", "pptx"].includes(suffix)) {
      toast.error("仅支持上传 PDF 或 PPTX 课件");
      event.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("session_id", sessionId);
      const uploaded = await request("/api/documents/ingest", { method: "POST", body: form });
      setSelectedDocumentId(uploaded._id);
      setPageNumber(1);
      await setPresentation({ sessionId, documentId: uploaded._id, pageNumber: 1 });
      toast.success(`课件“${uploaded.filename}”已解析并开始展示第 1 页`);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "课件上传失败");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const publishPage = async (nextPage = pageNumber) => {
    if (!selectedDocumentId) return;
    try {
      await setPresentation({ sessionId, documentId: selectedDocumentId, pageNumber: nextPage });
      setPageNumber(nextPage);
      setPageInput(String(nextPage));
      toast.success(`学生端已同步到第 ${nextPage} 页`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "同步课件页失败");
    }
  };

  const retryGraphSync = async () => {
    if (!selectedDocumentId) return;
    setSyncing(true);
    try {
      await request(`/api/documents/${encodeURIComponent(selectedDocumentId)}/sync-graph`, { method: "POST" });
      toast.success("课件图谱已同步到 Neo4j");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "图谱同步失败");
    } finally {
      setSyncing(false);
    }
  };

  // A document uploaded while Neo4j is still booting is initially marked
  // failed. Retry once silently when the document panel loads, so the common
  // startup race resolves without requiring the teacher to click first.
  useEffect(() => {
    if (!selectedDocumentId || detail?.graphStatus !== "failed") return;
    if (autoRetriedDocumentRef.current === selectedDocumentId) return;
    autoRetriedDocumentRef.current = selectedDocumentId;
    void request(`/api/documents/${encodeURIComponent(selectedDocumentId)}/sync-graph`, { method: "POST" })
      .then(() => refresh())
      .catch(() => undefined);
  }, [detail?.graphStatus, selectedDocumentId, request, refresh]);

  return (
    <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-indigo-600">课堂课件与实时页码</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">让学生跟随教师当前讲解页</h2>
          <p className="mt-1 text-sm text-slate-500">上传课件后选择页码，学生端会通过课堂实时通道自动同步。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refreshFeedback} disabled={refreshingFeedback} className="rounded-xl border border-cyan-300 bg-white px-4 py-3 text-sm font-bold text-cyan-700 hover:bg-cyan-50 disabled:opacity-50">
            {refreshingFeedback ? "刷新中…" : "刷新课堂反馈"}
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
            {uploading ? "正在解析课件…" : "上传 PDF / PPTX"}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf,.pptx" onChange={handleUpload} className="hidden" />
      </div>

      {documents.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
          当前课堂还没有课件。上传后系统会逐页提取文本，并在 Neo4j 可用时同步知识图谱。
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700" htmlFor="class-material">课堂课件</label>
            <select
              id="class-material"
              value={selectedDocumentId}
              onChange={async (event) => {
                const nextDocumentId = event.target.value;
                setSelectedDocumentId(nextDocumentId);
                setPageNumber(1);
                setPageInput("1");
                setSwitchingDocument(true);
                try {
                  await setPresentation({ sessionId, documentId: nextDocumentId, pageNumber: 1 });
                  refresh();
                  toast.success("已切换课件并同步到学生端");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "课件切换失败");
                } finally {
                  setSwitchingDocument(false);
                }
              }}
              disabled={switchingDocument}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500"
            >
              {documents.map((document: any) => (
                <option key={document._id} value={document._id}>{document.filename}</option>
              ))}
            </select>
            {detail && (
              <div className="rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
                <p><span className="font-bold">页数：</span>{detail.pageCount}</p>
                <p><span className="font-bold">解析：</span>{extractionLabels[detail.extractionStatus] || detail.extractionStatus}</p>
                <p><span className="font-bold">图谱：</span>{graphLabels[detail.graphStatus] || detail.graphStatus}</p>
                {detail.graphError && (
                  <details className="mt-1 text-amber-700">
                    <summary className="cursor-pointer font-semibold">查看同步错误</summary>
                    <p className="mt-1 break-words">{detail.graphError}</p>
                  </details>
                )}
                {detail.graphStatus !== "synced" && (
                  <button type="button" onClick={retryGraphSync} disabled={syncing} className="mt-2 font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
                    {syncing ? "正在同步…" : "重试 Neo4j 同步"}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-center gap-3 sm:gap-5">
              <button type="button" disabled={pageNumber <= 1} onClick={() => void publishPage(pageNumber - 1)} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold shadow-sm transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">上一页</button>
              <form
                className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 shadow-sm"
                onSubmit={(event) => {
                  event.preventDefault();
                  const next = Number.parseInt(pageInput, 10);
                  if (Number.isInteger(next) && next >= 1 && next <= pageCount) void publishPage(next);
                  else setPageInput(String(pageNumber));
                }}
              >
                <input aria-label="跳转页码" value={pageInput} onChange={(event) => setPageInput(event.target.value.replace(/[^0-9]/g, ""))} onBlur={() => setPageInput(String(pageNumber))} className="w-14 border-0 p-0 text-center text-lg font-black text-indigo-700 outline-none" inputMode="numeric" />
                <span className="text-sm font-bold text-slate-500">/ {pageCount || "—"}</span>
              </form>
              <button type="button" disabled={!detail || pageNumber >= pageCount} onClick={() => void publishPage(pageNumber + 1)} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold shadow-sm transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">下一页</button>
            </div>
            {presentation && (
              <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900" key={feedbackPulse}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black">本页实时反馈</span>
                  <span className="text-xs text-cyan-700">{liveEvents.isConnected ? "实时通道已连接" : "可点击上方刷新"}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-bold">
                  <span>没听懂：{feedbackCounts.unclear || 0}</span>
                  <span>讲得快：{feedbackCounts.too_fast || 0}</span>
                  <span>具体问题：{feedbackCounts.question || 0}</span>
                </div>
              </div>
            )}
            {presentation && <PresentationPage presentation={presentation} />}
            {presentation && (
              <p className="mt-3 text-xs text-emerald-700">学生端正在显示：{presentation.filename} · 第 {presentation.pageNumber} 页</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
