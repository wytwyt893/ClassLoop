import { useState } from "react";
import { api, useQuery } from "../services/dataProvider";
import { SessionCard } from "./SessionCard";
import { SessionDetail } from "./SessionDetail";
import { CreateSessionModal } from "./CreateSessionModal";
import { TimerConfigModal } from "./TimerConfigModal";
import { Doc } from "../services/types";

export function Dashboard() {
  const sessions = useQuery(api.sessions.getTeacherSessions) || [];
  const [selectedSession, setSelectedSession] = useState<Doc<"sessions"> | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);

  if (selectedSession) {
    return (
      <SessionDetail
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Teacher Workspace</p>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">我的课堂</h2>
          <p className="text-gray-600 mt-1">创建 Micro Check，查看实时作答并准备教学干预</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setShowTimerModal(true)}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold text-sm sm:text-base shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="hidden sm:inline">课堂计时器</span>
            <span className="sm:hidden">计时</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold text-sm sm:text-base shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="hidden sm:inline">创建课堂</span>
            <span className="sm:hidden">新课堂</span>
          </button>
        </div>
      </div>

      {/* <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-5 sm:p-6 mb-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex items-center justify-center w-12 h-12 bg-purple-600 rounded-xl flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-purple-900 mb-1">Timer Tool</h3>
            <p className="text-sm text-purple-700 mb-4">
              创建可自定义的课堂倒计时，无需关联课堂；适合课间休息、专注练习和限时活动。
            </p>
            <button
              onClick={() => setShowTimerModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-semibold shadow-sm"
            >
              Configure Timer
            </button>
          </div>
        </div>
      </div> */}

      {sessions.length === 0 ? (
        <div className="text-center py-16 sm:py-24 bg-white rounded-2xl border-2 border-dashed border-gray-300">
          <div className="max-w-md mx-auto px-4">
            <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              还没有课堂
            </h3>
            <p className="text-gray-600 mb-8">
              创建第一节课堂，开始收集学生作答证据。
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              创建第一节课堂
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard
              key={session._id}
              session={session}
              onClick={() => setSelectedSession(session)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateSessionModal onClose={() => setShowCreateModal(false)} />
      )}

      {showTimerModal && (
        <TimerConfigModal onClose={() => setShowTimerModal(false)} />
      )}
    </div>
  );
}
