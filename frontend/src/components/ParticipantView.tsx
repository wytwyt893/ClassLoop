import { useState, useEffect, useRef } from "react";
import { API_BASE_URL, api, useMutation, useQuery, useQueryState, useSessionEvents } from "../services/dataProvider";
import { toast } from "sonner";
import { Id } from "../services/types";
import { LessonContextBar } from "./LessonContextBar";
import { StudentPageFeedback } from "./StudentPageFeedback";
import { PresentationPage } from "./PresentationPage";

// Helper function to render text with clickable links
function TextWithLinks({ text, className = "" }: { text: string; className?: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
}

const AVATAR_OPTIONS = [
  { value: "🐶", name: "小狗", color: "from-orange-100 to-amber-200" },
  { value: "🐱", name: "猫头鹰", color: "from-violet-100 to-indigo-200" },
  { value: "🐻", name: "小熊", color: "from-slate-100 to-slate-300" },
  { value: "🐳", name: "蓝鲸", color: "from-cyan-100 to-blue-200" },
  { value: "🐼", name: "小熊猫", color: "from-blue-100 to-slate-200" },
  { value: "🦊", name: "小狐狸", color: "from-yellow-100 to-orange-200" },
  { value: "🐰", name: "小兔子", color: "from-pink-100 to-rose-200" },
  { value: "🐬", name: "小海豚", color: "from-emerald-100 to-teal-200" },
] as const;

export function ParticipantView() {
  const [sessionCode, setSessionCode] = useState("");
  const [participantId] = useState(() => `participant_${crypto.randomUUID()}`);
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [profileJoined, setProfileJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [currentElementIndex, setCurrentElementIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const selectedAvatarOption = AVATAR_OPTIONS[selectedAvatar];

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("session");
    if (code) {
      setSessionCode(code);
    }

  }, []);

  const registerParticipant = useMutation(api.responses.registerParticipant);
  const leaveParticipant = useMutation(api.responses.leaveParticipant);

  const sessionQuery = useQueryState(
    api.sessions.getSessionByCode,
    sessionCode ? { sessionCode } : "skip"
  );
  const session = sessionQuery.data;

  const elements = useQuery(
    api.elements.getVisibleElementsForParticipant,
    session && profileJoined ? { sessionId: session._id, participantId } : "skip"
  ) || [];

  const participantResponses = useQuery(
    api.responses.getParticipantResponses,
    session && profileJoined ? { sessionId: session._id, participantId } : "skip"
  ) || [];
  const liveEvents = useSessionEvents(session && profileJoined ? session._id : null);
  const presentation = useQuery(
    api.classroom.getPresentation,
    session && profileJoined ? { sessionId: session._id } : "skip",
  );
  const broadcasts = useQuery(
    api.sessions.getBroadcasts,
    session && profileJoined ? { sessionId: session._id } : "skip"
  ) || [];
  const latestBroadcast = broadcasts.length > 0 ? broadcasts[broadcasts.length - 1] : null;
  const seenBroadcastId = useRef<string | null>(null);

  useEffect(() => {
    if (!latestBroadcast || seenBroadcastId.current === latestBroadcast._id) return;
    seenBroadcastId.current = latestBroadcast._id;
    toast.info(`教师提示：${latestBroadcast.message}`, { duration: 10_000 });
  }, [latestBroadcast?._id, latestBroadcast?.message]);

  // Get custom colors with defaults
  const bgColor = session?.bgColor || "#f9fafb";
  const accentColor = session?.accentColor || "#2563eb";

  useEffect(() => {
    if (!profileJoined || !session?._id) return;
    const heartbeat = window.setInterval(() => {
      void registerParticipant({
        sessionId: session._id,
        participantId,
        displayName: displayName.trim(),
        avatar: selectedAvatarOption.value,
        avatarName: selectedAvatarOption.name,
      });
    }, 30_000);
    const leave = () => {
      navigator.sendBeacon(
        `${API_BASE_URL}/api/public/sessions/${encodeURIComponent(session._id)}/participants/${encodeURIComponent(participantId)}/leave`,
        new Blob([], { type: "text/plain" }),
      );
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("pagehide", leave);
    };
  }, [profileJoined, session?._id, participantId, displayName, selectedAvatarOption.value, selectedAvatarOption.name, registerParticipant]);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      setSessionCode(inputCode.trim().toUpperCase());
      setProfileJoined(false);
      // Update URL without reloading
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("session", inputCode.trim().toUpperCase());
      window.history.pushState({}, "", newUrl);
    }
  };

  if (!sessionCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ClassLoop</h1>
            <p className="text-gray-600">输入课堂码加入 Micro Check</p>
          </div>
          <form onSubmit={handleCodeSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-2">
              课堂码
            </label>
            <input
              id="sessionCode"
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="请输入 6 位课堂码"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-center text-lg font-mono uppercase"
              autoFocus
              maxLength={10}
            />
            <button
              type="submit"
              disabled={!inputCode.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              加入课堂
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (sessionQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (sessionQuery.error) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="text-4xl">⚠️</div>
          <h1 className="mt-4 text-2xl font-black text-slate-900">无法连接课堂数据库</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">课堂查询请求失败，请确认 ClassLoop 后端已经启动，然后重试。</p>
          <div className="mt-6 flex justify-center gap-3"><button onClick={() => window.location.reload()} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">重新查询</button><a href="/student" className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-600">重新输入</a></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">未找到课堂</h1>
            <p className="text-gray-600 mb-1">课堂码 <span className="font-mono font-semibold">{sessionCode}</span> 无效</p>
            <p className="text-sm text-gray-500">请检查后重新输入</p>
          </div>
          
          <form onSubmit={handleCodeSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-2">
              输入其他课堂码
            </label>
            <input
              id="sessionCode"
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="请输入课堂码（例如 ABC123）"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-center text-lg font-mono uppercase"
              autoFocus
              maxLength={10}
            />
            <button
              type="submit"
              disabled={!inputCode.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              重新查找
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600 mb-3">教师需要创建自己的互动课堂</p>
              <a
                href="/"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                 返回 ClassLoop 首页
              </a>
            </div>
        </div>
      </div>
    );
  }

  if (!session.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{session.title}</h1>
          <p className="text-gray-600">课堂当前未开放，请等待教师启用</p>
        </div>
      </div>
    );
  }

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) return;
    setJoining(true);
    try {
      await registerParticipant({
        sessionId: session._id,
        participantId,
        displayName: name,
        avatar: selectedAvatarOption.value,
        avatarName: selectedAvatarOption.name,
      });
      setProfileJoined(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加入课堂失败");
    } finally {
      setJoining(false);
    }
  };

  const exitClassroom = async () => {
    try {
      if (profileJoined) await leaveParticipant({ sessionId: session._id, participantId });
    } finally {
      window.location.href = "/";
    }
  };

  if (!profileJoined) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-xl">
          <div className="mb-6 text-center text-white">
            <p className="text-sm font-semibold text-cyan-300">课堂码 #{sessionCode}</p>
            <h1 className="mt-2 text-3xl font-black">创建本次课堂身份</h1>
            <p className="mt-2 text-sm text-slate-300">{session.title}</p>
          </div>
          <form onSubmit={handleProfileSubmit} className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <label className="block text-sm font-bold text-slate-700" htmlFor="temporary-name">临时用户名</label>
            <input
              id="temporary-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value.slice(0, 16))}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="例如：小明"
              autoComplete="off"
              autoFocus
              required
            />
            <div className="mt-6">
              <p className="text-sm font-bold text-slate-700">选择一个课堂头像</p>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {AVATAR_OPTIONS.map((avatar, index) => (
                  <button
                    key={avatar.name}
                    type="button"
                    onClick={() => setSelectedAvatar(index)}
                    aria-label={`选择${avatar.name}`}
                    className={`rounded-2xl border-2 bg-gradient-to-br p-3 text-center transition ${avatar.color} ${selectedAvatar === index ? "border-blue-600 ring-4 ring-blue-100" : "border-transparent hover:border-blue-200"}`}
                  >
                    <span className="block text-3xl" aria-hidden="true">{avatar.value}</span>
                    <span className="mt-1 block text-[11px] font-bold text-slate-700">{avatar.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900">
            头像和用户名仅用于本次在线课堂，不会写入教师账号数据库；退出或离线超时后会自动清除。
            </div>
            <button disabled={!displayName.trim() || joining} className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {joining ? "正在加入…" : `${selectedAvatarOption.value} ${displayName.trim() || selectedAvatarOption.name} 加入`}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeElements = elements.filter(e => e.isActive);
  const respondedElementIds = new Set(participantResponses.map(r => r.elementId));
  const allElementsResponded = activeElements.every(e => respondedElementIds.has(e._id));

  // Show completion screen if completed OR if all responded (unless user is actively editing)
  const shouldShowCompletion = (isCompleted || allElementsResponded) && !isEditing;

  if (shouldShowCompletion) {
    const handleEditResponses = () => {
      setIsEditing(true);
      setIsCompleted(false);
      setCurrentElementIndex(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
            {latestBroadcast && <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left text-sm text-blue-950"><span className="font-black">教师实时提示：</span>{latestBroadcast.message}</div>}
          <StudentPageFeedback sessionId={session._id} participantId={participantId} presentation={presentation} />
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            {session.completionImageUrl && (
              <div className="mb-6 flex justify-center">
                <img
                  src={session.completionImageUrl}
                  alt="Completion image"
                  className="max-w-full max-h-64 object-contain rounded-lg"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              <TextWithLinks text={session.completionTitle || "本轮作答已完成"} />
            </h1>
            {session.completionSubtitle && (
              <p className="text-xl text-gray-700 mb-4">
                <TextWithLinks text={session.completionSubtitle} />
              </p>
            )}
            {session.completionDescription && (
              <p className="text-gray-600 mb-6">
                <TextWithLinks text={session.completionDescription} />
              </p>
            )}
            
            {/* Edit Responses Button */}
            <div className="mb-6">
              <button
                onClick={handleEditResponses}
                className="px-6 py-3 text-white rounded-lg transition-colors font-medium shadow-md hover:shadow-lg"
                style={{ 
                  backgroundColor: accentColor,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                 修改我的回答
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">教师需要创建自己的互动课堂</p>
              <button
                onClick={() => void exitClassroom()}
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                退出课堂并清除临时身份
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeElements.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          {latestBroadcast && <div className="mb-6 max-w-xl rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left text-sm text-blue-950"><span className="font-black">教师实时提示：</span>{latestBroadcast.message}</div>}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{session.title}</h1>
          <p className="text-gray-500">教师尚未发布 Micro Check</p>
        </div>
      </div>
    );
  }

  const currentElement = activeElements[currentElementIndex];
  const hasResponded = respondedElementIds.has(currentElement._id);
  const isLastElement = currentElementIndex === activeElements.length - 1;

  const handleNext = () => {
    if (currentElementIndex < activeElements.length - 1) {
      setCurrentElementIndex(currentElementIndex + 1);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsCompleted(true);
      setIsEditing(false); // Reset editing mode to show completion screen
    }
  };

  const handlePrevious = () => {
    if (currentElementIndex > 0) {
      setCurrentElementIndex(currentElementIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
      <div className="flex-1 px-3 py-5 pb-36 sm:px-6 sm:py-8 sm:pb-44">
        <div className="mx-auto w-full max-w-3xl">
          <LessonContextBar sessionCode={sessionCode} />
          <StudentPageFeedback sessionId={session._id} participantId={participantId} presentation={presentation} />
          <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
            <span>{liveEvents.isConnected ? "● 已连接课堂实时通道" : "● 实时通道重连中，系统将自动补偿同步"}</span>
            <span className={liveEvents.isConnected ? "text-emerald-600" : "text-amber-600"}>{liveEvents.isConnected ? "实时" : "轮询兜底"}</span>
          </div>
          {latestBroadcast && <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 shadow-sm"><span className="font-black">教师实时提示：</span>{latestBroadcast.message}</div>}
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-2xl ${selectedAvatarOption.color}`}>{selectedAvatarOption.value}</span>
              <div><p className="text-xs text-slate-500">本次课堂身份</p><p className="font-bold text-slate-800">{displayName.trim()}</p></div>
            </div>
            <button onClick={() => void exitClassroom()} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600">退出课堂</button>
          </div>
          {/* Display session image on first question */}
          {currentElementIndex === 0 && session.completionImageUrl && (
            <div className="mb-6 flex justify-center">
              <img
                src={session.completionImageUrl}
                alt="Session image"
                className="max-w-full max-h-64 object-contain rounded-lg"
              />
            </div>
          )}

          <div className="mb-8 text-center sm:mb-10">
            <h1 className="mb-3 text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">{session.title}</h1>
            {session.description && (
              <p className="text-gray-600">{session.description}</p>
            )}
            
            {/* Progress indicator */}
            <div className="mt-4">
              <div className="flex justify-center items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">
                  第 {currentElementIndex + 1} / {activeElements.length} 题
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${((currentElementIndex + 1) / activeElements.length) * 100}%`,
                    backgroundColor: accentColor
                  }}
                />
              </div>
            </div>
          </div>

        <ElementResponse
          element={currentElement}
          sessionId={session._id}
          participantId={participantId}
          hasResponded={hasResponded}
          isLastElement={isLastElement}
          onNext={handleNext}
          onPrevious={handlePrevious}
          canGoPrevious={currentElementIndex > 0}
          accentColor={accentColor}
          bgColor={bgColor}
        />
        </div>
      </div>
    </div>
  );
}

interface ElementResponseProps {
  element: any;
  sessionId: Id<"sessions">;
  participantId: string;
  hasResponded: boolean;
  isLastElement: boolean;
  onNext: () => void;
  onPrevious: () => void;
  canGoPrevious: boolean;
  accentColor: string;
  bgColor: string;
}

function ElementResponse({ 
  element, 
  sessionId, 
  participantId, 
  hasResponded, 
  isLastElement, 
  onNext, 
  onPrevious, 
  canGoPrevious,
  accentColor,
  bgColor
}: ElementResponseProps) {
  const [textValue, setTextValue] = useState("");
  const [numberValue, setNumberValue] = useState(element.minValue || 0);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [existingFileId, setExistingFileId] = useState<Id<"_storage"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedThisSession, setHasSubmittedThisSession] = useState(hasResponded);

  const submitResponse = useMutation(api.responses.submitResponse);
  const generateUploadUrl = useMutation(api.elements.generateUploadUrl);
  
  // Load existing response if available
  const existingResponses = useQuery(
    api.responses.getParticipantResponses,
    { sessionId, participantId }
  ) || [];

  // Get file metadata for existing file upload
  const existingFileMetadata = useQuery(
    api.responses.getFileMetadata,
    existingFileId ? { fileId: existingFileId } : "skip"
  );

  // Reset state when element changes
  useEffect(() => {
    setTextValue("");
    setNumberValue(element.minValue || 0);
    setSelectedChoices([]);
    setUploadedFile(null);
    setExistingFileId(null);
    setHasSubmittedThisSession(false);
  }, [element._id]);

  // Load existing response if available
  useEffect(() => {
    const existingResponse = existingResponses.find(r => r.elementId === element._id);
    if (existingResponse) {
      if (existingResponse.textValue) setTextValue(existingResponse.textValue);
      if (existingResponse.numberValue !== undefined) setNumberValue(existingResponse.numberValue);
      if (existingResponse.choiceIds) setSelectedChoices(existingResponse.choiceIds);
      if (existingResponse.fileId) setExistingFileId(existingResponse.fileId);
      setHasSubmittedThisSession(true);
    }
  }, [existingResponses, element._id]);

  const handleSubmitAndNext = async () => {
    setIsSubmitting(true);
    try {
      let fileId: Id<"_storage"> | undefined;
      
      if (element.type === "file_upload") {
        if (uploadedFile) {
          // Upload new file
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": uploadedFile.type },
            body: uploadedFile,
          });
          const json = await result.json();
          if (!result.ok) {
            throw new Error(`文件上传失败：${JSON.stringify(json)}`);
          }
          fileId = json.storageId;
        } else if (existingFileId) {
          // Keep existing file if no new file uploaded
          fileId = existingFileId;
        }
      }

      await submitResponse({
        sessionId,
        elementId: element._id,
        participantId,
        textValue: element.type === "text_input" ? textValue : undefined,
        numberValue: element.type === "number_input" ? numberValue : undefined,
        choiceIds: (element.type === "single_choice" || element.type === "single_choice_unique" || element.type === "multiple_choice") 
          ? selectedChoices : undefined,
        fileId,
      });

      setHasSubmittedThisSession(true);
      toast.success("回答已保存");
      onNext();
    } catch (error) {
      toast.error("提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = () => {
    switch (element.type) {
      case "text_input":
        return textValue.trim().length > 0;
      case "number_input":
        return true; // Always valid for number input
      case "single_choice":
      case "single_choice_unique":
      case "multiple_choice":
        return selectedChoices.length > 0;
      case "file_upload":
        return uploadedFile !== null || existingFileId !== null;
      default:
        return false;
    }
  };

  const handleChoiceChange = (choiceId: string) => {
    if (element.type === "single_choice" || element.type === "single_choice_unique") {
      setSelectedChoices([choiceId]);
    } else {
      setSelectedChoices(prev => 
        prev.includes(choiceId) 
          ? prev.filter(id => id !== choiceId)
          : [...prev, choiceId]
      );
    }
  };

  const getHintText = () => {
    switch (element.type) {
      case "text_input":
        return "在下方输入回答";
      case "number_input":
        return "拖动滑块选择数值";
      case "single_choice":
        return "请选择一个选项";
      case "single_choice_unique":
        return "请选择一个选项";
      case "multiple_choice":
        return "请选择一个或多个选项";
      case "file_upload":
        return "上传文件后提交";
      default:
        return "";
    }
  };

  return (
    <>
      {/* Question Title & Subtitle - Sticky on scroll */}
      <div 
        className="sticky top-0 z-40 mb-4 -mx-3 border-b border-gray-200 px-3 pb-5 pt-3 sm:-mx-6 sm:px-6"
        style={{ 
          backgroundColor: bgColor,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
        }}
      >
        <h2 className="mb-3 text-xl font-bold leading-snug text-gray-900 sm:text-2xl md:text-3xl">{element.title}</h2>
        {element.subtitle && (
          <p className="text-lg md:text-xl text-gray-700 mb-3">{element.subtitle}</p>
        )}
        {element.description && (
          <p className="text-gray-600 mb-4">{element.description}</p>
        )}
        
        {/* Hint text */}
        <p className="text-sm text-gray-500 italic">{getHintText()}</p>
      </div>

      {element.imageUrl && (
        <div className="mb-6 flex justify-center">
          <img
            src={element.imageUrl}
            alt="题目配图"
            className="max-w-full max-h-96 object-contain rounded-lg shadow-md"
          />
        </div>
      )}

      {/* Response Input Area */}
      <div className="mb-6">
        {element.type === "text_input" && (
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white shadow-sm"
            placeholder="请输入你的回答"
            rows={6}
          />
        )}

        {element.type === "number_input" && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <input
              type="range"
              min={element.minValue || 0}
              max={element.maxValue || 100}
              step={element.step || 1}
              value={numberValue}
              onChange={(e) => setNumberValue(Number(e.target.value))}
              className="w-full mb-4"
              style={{
                accentColor: accentColor
              }}
            />
            <div className="text-center text-3xl font-bold mb-2" style={{ color: accentColor }}>{numberValue}</div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>{element.minValue || 0}</span>
              <span>{element.maxValue || 100}</span>
            </div>
          </div>
        )}

        {(element.type === "single_choice" || element.type === "single_choice_unique" || element.type === "multiple_choice") && (
          (() => {
            const hasAnyImage = element.choices?.some((c: any) => c.imageUrl);
            const choiceCount = element.choices?.length || 0;
            
            // Determine grid layout based on choices
            let gridClass = "";
            if (hasAnyImage) {
              // For image choices: responsive grid
              if (choiceCount <= 2) {
                gridClass = "grid grid-cols-1 sm:grid-cols-2 gap-4";
              } else if (choiceCount <= 4) {
                gridClass = "grid grid-cols-2 gap-4";
              } else {
                gridClass = "grid grid-cols-2 md:grid-cols-3 gap-4";
              }
            } else {
              // For text-only choices
              if (choiceCount === 2) {
                gridClass = "grid grid-cols-1 sm:grid-cols-2 gap-3";
              } else if (choiceCount <= 4) {
                gridClass = "grid grid-cols-1 gap-3";
              } else {
                gridClass = "grid grid-cols-1 sm:grid-cols-2 gap-3";
              }
            }
            
            return (
              <div className={gridClass}>
                {element.choices?.map((choice: any) => {
                  const isSelected = selectedChoices.includes(choice.id);
                  const hasImage = !!choice.imageUrl;
                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleChoiceChange(choice.id)}
                      className={`
                        ${hasImage ? "flex flex-col items-center justify-start" : "flex items-center justify-center"} 
                        ${hasImage ? "p-3" : "p-4 min-h-[60px]"}
                        border-2 rounded-lg transition-all relative
                        ${isSelected 
                          ? "shadow-md scale-[0.98]" 
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                        }
                      `}
                      style={isSelected ? {
                        borderColor: accentColor,
                        backgroundColor: `${accentColor}10`
                      } : {}}
                    >
                      {choice.imageUrl && (
                        <div className="w-full aspect-video mb-2 overflow-hidden rounded bg-gray-50 flex items-center justify-center">
                          <img
                            src={choice.imageUrl}
                            alt="选项配图"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <span 
                        className={`
                          ${hasImage ? "text-center text-sm font-medium" : "text-base font-medium text-center"}
                        `}
                        style={isSelected ? { color: accentColor } : { color: "#111827" }}
                      >
                        {choice.text || ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()
        )}

        {element.type === "file_upload" && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            {existingFileMetadata && !uploadedFile && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-1">宸蹭笂浼犳枃浠讹細</p>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-blue-800">
                      {existingFileMetadata.contentType || "文件"}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                        大小：{(existingFileMetadata.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {existingFileMetadata && !uploadedFile ? "上传新文件（可选）" : "上传文件"}
              </label>
              <input
                type="file"
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              />
            </div>
            {uploadedFile && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  已选择新文件：{uploadedFile.name}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {hasSubmittedThisSession && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <p className="text-green-800 text-sm font-medium">✓ 回答已保存。你仍可修改答案并再次提交。</p>
        </div>
      )}

      {/* Fixed Footer with Navigation and Consent */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-5">
          {/* Navigation Buttons */}
          <div className="flex gap-3 mb-3">
            {canGoPrevious && (
              <button
                onClick={onPrevious}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                上一题              </button>
            )}
            <button
              onClick={handleSubmitAndNext}
              disabled={!canSubmit() || isSubmitting}
              className="flex-1 px-6 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              style={{ 
                backgroundColor: accentColor,
                filter: !canSubmit() || isSubmitting ? 'brightness(0.7)' : 'brightness(1)'
              }}
              onMouseEnter={(e) => {
                if (canSubmit() && !isSubmitting) {
                  e.currentTarget.style.filter = 'brightness(0.9)';
                }
              }}
              onMouseLeave={(e) => {
                if (canSubmit() && !isSubmitting) {
                  e.currentTarget.style.filter = 'brightness(1)';
                }
              }}
            >
                {isSubmitting ? "保存中…" : isLastElement ? "完成" : "下一题"}
            </button>
          </div>
          
          {/* Consent Notice */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              By submitting, your responses will be stored and accessible to the poll creator.{" "}
              <a 
                href="/privacy" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Privacy Policy
              </a>
              {" 路 "}
              <a 
                href="/terms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Terms of Use
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}




