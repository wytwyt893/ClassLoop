import { useState, useEffect } from "react";
import { api, useMutation, useQuery, useSessionEvents } from "../services/dataProvider";
import { toast } from "sonner";
import { MisconceptionPanel } from "./MisconceptionPanel";
import { ClassroomInsightPanel } from "./ClassroomInsightPanel";

export function ResultsView() {
  const [sessionCode, setSessionCode] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showParticipantManager, setShowParticipantManager] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [broadcastText, setBroadcastText] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("session");
    if (code) {
      setSessionCode(code);
    }
  }, []);

  const session = useQuery(
    api.sessions.getSessionByCode,
    sessionCode ? { sessionCode } : "skip"
  );
  const liveEvents = useSessionEvents(session?._id);

  const accessVerification = useQuery(
    api.sessions.verifyResultsAccess,
    sessionCode && (session?.resultsPublic || pinCode.length === 4) 
      ? { sessionCode, pinCode: pinCode || undefined } 
      : "skip"
  );

  const elements = useQuery(
    api.elements.getSessionElements,
    session && accessGranted ? { sessionId: session._id } : "skip"
  ) || [];

  const responses = useQuery(
    api.responses.getSessionResponses,
    session && accessGranted ? { sessionId: session._id } : "skip"
  ) || [];

  const isOwner = useQuery(
    api.responses.checkSessionOwnership,
    session ? { sessionId: session._id } : "skip"
  );

  const participants = useQuery(
    api.responses.getSessionParticipants,
    session && isOwner ? { sessionId: session._id } : "skip"
  );

  const deleteAllResponses = useMutation(api.responses.deleteAllSessionResponses);
  const deleteParticipantResponses = useMutation(api.responses.deleteParticipantResponses);
  const sendBroadcast = useMutation(api.sessions.sendBroadcast);

  // Get custom colors with defaults
  const bgColor = session?.bgColor || "#f9fafb";
  const accentColor = session?.accentColor || "#2563eb";

  useEffect(() => {
    if (accessVerification) {
      if (accessVerification.success) {
        setAccessGranted(true);
        setPinError("");
      } else {
        setAccessGranted(false);
        if (accessVerification.error === "Pin code required") {
          setShowPinInput(true);
        } else if (accessVerification.error === "Invalid pin code") {
          setPinError("访问码不正确，请重新输入。");
        }
      }
    }
  }, [accessVerification]);

  useEffect(() => {
    if (session && session.resultsPublic) {
      setAccessGranted(true);
    } else if (session && !session.resultsPublic) {
      setShowPinInput(true);
    }
  }, [session]);

  // Handle escape key to close image modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && imageModalUrl) {
        setImageModalUrl(null);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [imageModalUrl]);

  const handleExportCSV = () => {
    if (!session || !elements || !responses) return;

    // Create CSV header
    const headers = ["学生标识", "题目", "题目类型", "回答", "文件地址"];
    const rows = [headers];

    // Group responses by participant
    const participantIds = new Set(responses.map(r => r.participantId));
    
    participantIds.forEach(participantId => {
      elements.forEach(element => {
        const response = responses.find(r => r.participantId === participantId && r.elementId === element._id);
        
        if (response) {
          let responseValue = "";
          
          if (response.textValue) {
            responseValue = `"${response.textValue.replace(/"/g, '""')}"`;
          } else if (response.numberValue !== undefined) {
            responseValue = response.numberValue.toString();
          } else if (response.choiceIds && response.choiceIds.length > 0) {
            const choiceTexts = response.choiceIds.map((choiceId: string) => {
              const choice = element.choices?.find((c: any) => c.id === choiceId);
              return choice?.text || choiceId;
            });
            responseValue = `"${choiceTexts.join(", ")}"`;
          } else if (response.fileUrl) {
            responseValue = "已上传文件";
          }

          rows.push([
            participantId,
            `"${element.title.replace(/"/g, '""')}"`,
            element.type,
            responseValue,
            response.fileUrl || ""
          ]);
        }
      });
    });

    // Convert to CSV string
    const csv = rows.map(row => row.join(",")).join("\n");

    // Download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}_results_${sessionCode}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("课堂结果已导出");
  };

  const handleDeleteResponses = async () => {
    if (!session) return;
    
    try {
      await deleteAllResponses({ sessionId: session._id });
      toast.success("全部回答已删除");
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error("删除回答失败，请稍后重试");
      console.error(error);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!session) return;
    
    try {
      await deleteParticipantResponses({ sessionId: session._id, participantId });
      toast.success("该学生的回答已删除");
      setParticipantToDelete(null);
    } catch (error) {
      toast.error("删除学生回答失败，请稍后重试");
      console.error(error);
    }
  };

  const handleBroadcast = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = broadcastText.trim();
    if (!session || !message) return;
    setSendingBroadcast(true);
    try {
      await sendBroadcast({ sessionId: session._id, message });
      setBroadcastText("");
      toast.success("课堂提示已实时发送给学生");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "课堂提示发送失败");
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (!sessionCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ClassLoop 课堂结果</h1>
          <p className="text-gray-600">链接中缺少课堂码</p>
        </div>
      </div>
    );
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">未找到课堂</h1>
          <p className="text-gray-600">课堂码“{sessionCode}”无效</p>
        </div>
      </div>
    );
  }

  if (showPinInput && !accessGranted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{session.title} · 课堂结果</h1>
            <p className="text-gray-600">该课堂的结果受保护，需要访问码才能查看</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                请输入 4 位访问码
              </label>
              <input
                type="text"
                value={pinCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPinCode(value);
                  setPinError("");
                }}
                className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0000"
                maxLength={4}
              />
              {pinError && (
                <p className="mt-2 text-sm text-red-600">{pinError}</p>
              )}
            </div>
            
            <div className="text-center text-sm text-gray-500">
              <p className="mb-2">课堂码：{sessionCode}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!accessGranted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalParticipants = new Set(responses.map(r => r.participantId)).size;

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: bgColor }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <p className="mb-2 text-xs font-bold tracking-[0.2em] text-blue-600">实时回答 · 课堂误区分析</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.title} · 课堂结果</h1>
          {session.description && (
            <p className="text-gray-600">{session.description}</p>
          )}
          <div className="flex justify-center gap-4 mt-4 text-sm flex-wrap">
            <span 
              className="px-3 py-1 rounded-full"
              style={{ 
                backgroundColor: `${accentColor}20`,
                color: accentColor
              }}
            >
              课堂码：{sessionCode}
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
              {totalParticipants} 位学生
            </span>
            <span className={`px-3 py-1 rounded-full ${liveEvents.isConnected ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
              {liveEvents.isConnected ? "● 实时通道已连接" : "○ 实时通道重连中"}
            </span>
            {!session.resultsPublic && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                结果受保护
              </span>
            )}
          </div>
          
          {/* Owner Actions */}
          {isOwner && (
            <div className="flex justify-center gap-3 mt-6 flex-wrap">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                导出 CSV
              </button>
              <button
                onClick={() => setShowParticipantManager(true)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                管理学生
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-50 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                清空全部回答
              </button>
            </div>
          )}
        </div>

        {isOwner && (
          <form onSubmit={handleBroadcast} className="mb-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 text-left">
                <label htmlFor="classroom-broadcast" className="text-sm font-bold text-slate-800">向全班发送实时提示</label>
                <p className="mt-1 text-xs text-slate-500">适合发布讲解提醒、讨论任务或临时课堂安排，学生端将即时收到。</p>
                <input id="classroom-broadcast" value={broadcastText} onChange={(event) => setBroadcastText(event.target.value.slice(0, 280))} className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="例如：请重新观察第 2 个选项，我们一分钟后一起讨论。" />
              </div>
              <button disabled={!broadcastText.trim() || sendingBroadcast} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                {sendingBroadcast ? "正在发送…" : "实时发送"}
              </button>
            </div>
          </form>
        )}

        {isOwner && <ClassroomInsightPanel sessionId={session._id} />}

        <MisconceptionPanel elements={elements} responses={responses} totalParticipants={totalParticipants} />

        {elements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">该课堂还没有 Micro Check</p>
          </div>
        ) : (
          <div className="space-y-8">
            {elements.map((element) => (
              <ElementResults
                key={element._id}
                element={element}
                responses={responses.filter(r => r.elementId === element._id)}
                totalParticipants={totalParticipants}
                accentColor={accentColor}
                onImageClick={setImageModalUrl}
              />
            ))}
          </div>
        )}
        
        {/* CTA Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
               ClassLoop · 从作答走向认知反馈
            </h2>
            <p className="text-gray-600 mb-6">
               当前统计基于数据库中的课堂回答完成，下一阶段将接入误区语义归并与教学干预建议。
            </p>
            <a
              href="/"
              className="inline-block px-8 py-3 text-white rounded-lg transition-colors font-medium"
              style={{ backgroundColor: accentColor }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              返回 ClassLoop 首页
            </a>
          </div>
        </div>
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  删除全部回答？
                </h3>
                <p className="text-sm text-gray-600">
                  将永久删除 {totalParticipants} 位学生提交的全部 {responses.length} 条回答，且无法恢复。
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleDeleteResponses}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                删除全部回答
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participant Manager Modal */}
      {showParticipantManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div><h3 className="text-xl font-semibold text-gray-900">课堂成员</h3><p className="mt-1 text-xs text-gray-500">临时头像和用户名在学生退出后自动清除</p></div>
              <button
                onClick={() => setShowParticipantManager(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {participants && participants.length > 0 ? (
                <div className="space-y-2">
                  {participants.map((participant, index) => (
                    <div
                      key={participant.participantId}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-2xl shadow-sm">{participant.avatar || "👤"}</span>
                        <div>
                        <div className="flex items-center gap-2 font-medium text-gray-900">
                          {participant.displayName || `匿名学生 #${index + 1}`}
                          {participant.isOnline && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">在线</span>}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {participant.avatarName ? `${participant.avatarName} · ` : ""}{participant.responseCount} 条回答 · 加入于 {new Date(participant.firstResponseTime).toLocaleString()}
                        </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setParticipantToDelete(participant.participantId)}
                        className="ml-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        删除回答
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  暂无课堂成员
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowParticipantManager(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Participant Confirmation Modal */}
      {participantToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  删除该学生的回答？
                </h3>
                <p className="text-sm text-gray-600">
                  将永久删除该学生提交的全部回答，且无法恢复。
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setParticipantToDelete(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteParticipant(participantToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Modal */}
      {imageModalUrl && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4"
          onClick={() => setImageModalUrl(null)}
        >
          <button
            onClick={() => setImageModalUrl(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
            aria-label="关闭图片预览"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div 
            className="max-w-[95vw] max-h-[95vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageModalUrl}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
              Click anywhere or press ESC to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface ElementResultsProps {
  element: any;
  responses: any[];
  totalParticipants: number;
  accentColor: string;
  onImageClick: (url: string) => void;
}

function ElementResults({ element, responses, totalParticipants, accentColor, onImageClick }: ElementResultsProps) {
  const getChoiceStats = () => {
    if (!element.choices) return {};
    
    const stats: Record<string, number> = {};
    element.choices.forEach((choice: any) => {
      stats[choice.id] = 0;
    });

    responses.forEach(response => {
      if (response.choiceIds) {
        response.choiceIds.forEach((choiceId: string) => {
          stats[choiceId] = (stats[choiceId] || 0) + 1;
        });
      }
    });

    return stats;
  };

  const getNumberStats = () => {
    const values = responses
      .map(r => r.numberValue)
      .filter(v => v !== undefined && v !== null);
    
    if (values.length === 0) return null;

    return {
      count: values.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  };

  const choiceStats = getChoiceStats();
  const numberStats = getNumberStats();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{element.title}</h3>
        {element.subtitle && (
          <p className="text-gray-700 mb-1">{element.subtitle}</p>
        )}
        {element.description && (
          <p className="text-gray-600 text-sm">{element.description}</p>
        )}
        <div className="mt-2 text-sm text-gray-500">
          {totalParticipants} 位学生中已有 {responses.length} 位作答
        </div>
      </div>

      {element.imageUrl && (
        <div className="mb-6 flex justify-center">
          <button
            onClick={() => onImageClick(element.imageUrl)}
            className="relative group cursor-pointer"
          >
            <img
              src={element.imageUrl}
              alt="题目配图"
              className="max-w-md max-h-64 object-contain rounded-lg group-hover:opacity-90 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {(element.type === "single_choice" || element.type === "single_choice_unique" || element.type === "multiple_choice") && (
        <div className="space-y-3">
          {element.choices?.map((choice: any) => {
            const count = choiceStats[choice.id] || 0;
            const percentage = responses.length > 0 ? (count / responses.length) * 100 : 0;
            const isCorrect = choice.isCorrect || false;
            
            return (
              <div 
                key={choice.id} 
                className={`flex items-center gap-4 p-3 rounded-lg ${isCorrect ? 'bg-green-50 border-2 border-green-300' : 'bg-white'}`}
              >
                {choice.imageUrl && (
                  <button
                    onClick={() => onImageClick(choice.imageUrl)}
                    className="w-12 h-12 flex-shrink-0 bg-gray-50 rounded overflow-hidden flex items-center justify-center group cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                  >
                    <img
                      src={choice.imageUrl}
                      alt="选项配图"
                      className="w-full h-full object-contain group-hover:opacity-80 transition-opacity"
                    />
                  </button>
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isCorrect ? 'text-green-900' : ''}`}>
                        {choice.text || "图片选项"}
                      </span>
                      {isCorrect && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">
                          ✓ 正确答案
                        </span>
                      )}
                    </div>
                    <span className={`text-sm ${isCorrect ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: isCorrect ? '#16a34a' : accentColor
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {element.type === "number_input" && numberStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: accentColor }}>{numberStats.count}</div>
            <div className="text-sm text-gray-600">回答数</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{numberStats.average.toFixed(1)}</div>
            <div className="text-sm text-gray-600">平均值</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{numberStats.min}</div>
            <div className="text-sm text-gray-600">最小值</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{numberStats.max}</div>
            <div className="text-sm text-gray-600">最大值</div>
          </div>
        </div>
      )}

      {element.type === "text_input" && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {responses.filter(r => r.textValue).map((response, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm">{response.textValue}</p>
            </div>
          ))}
          {responses.filter(r => r.textValue).length === 0 && (
            <p className="text-gray-500 text-sm">暂无文本回答</p>
          )}
        </div>
      )}

      {element.type === "file_upload" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">已上传文件：</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {responses.filter(r => r.fileUrl).map((response, index) => {
              // Check if file is an image based on content type
              const isImage = response.fileContentType && response.fileContentType.startsWith('image/');
              
              return (
                <div key={index} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                  {isImage ? (
                    <button
                      onClick={() => onImageClick(response.fileUrl)}
                      className="block group w-full text-left cursor-pointer"
                    >
                      <div className="relative aspect-video bg-gray-100">
                        <img
                          src={response.fileUrl}
                          alt={`上传文件 ${index + 1}`}
                          className="w-full h-full object-contain group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                      <div className="p-2 text-center">
                        <span 
                          className="text-xs font-medium hover:underline"
                          style={{ color: accentColor }}
                        >
                          点击查看原图
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="p-3">
                      <a
                        href={response.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-sm"
                        style={{ color: accentColor }}
                      >
                        📎 文件 {index + 1}
                        {response.fileContentType && (
                          <span className="block text-xs text-gray-500 mt-1">
                            {response.fileContentType}
                          </span>
                        )}
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {responses.filter(r => r.fileUrl).length === 0 && (
            <p className="text-gray-500 text-sm">暂无上传文件</p>
          )}
        </div>
      )}
    </div>
  );
}
