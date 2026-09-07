import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SessionCard } from "./SessionCard";
import { SessionDetail } from "./SessionDetail";
import { CreateSessionModal } from "./CreateSessionModal";
import { TimerConfigModal } from "./TimerConfigModal";
import { Doc } from "../../convex/_generated/dataModel";

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
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Your Polls</h2>
          <p className="text-gray-600 mt-1">Manage and create interactive classroom experiences</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setShowTimerModal(true)}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold text-sm sm:text-base shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="hidden sm:inline">Create Timer</span>
            <span className="sm:hidden">Timer</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold text-sm sm:text-base shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="hidden sm:inline">Create Session</span>
            <span className="sm:hidden">New Session</span>
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
              Create customizable countdown timers for any activity - no session required! Perfect for breaks, focus sessions, or timed activities.
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
              No sessions yet
            </h3>
            <p className="text-gray-600 mb-8">
              Create your first session to start collecting responses from participants.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              Create Your First Session
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
