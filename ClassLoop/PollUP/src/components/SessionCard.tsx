import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface SessionCardProps {
  session: Doc<"sessions">;
  onClick: () => void;
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const toggleActive = useMutation(api.sessions.toggleSessionActive);
  const deleteSession = useMutation(api.sessions.deleteSession);
  const cloneSession = useMutation(api.sessions.cloneSession);

  const handleToggleActive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleActive({
        sessionId: session._id,
        isActive: !session.isActive,
      });
      toast.success(session.isActive ? "Session deactivated" : "Session activated");
    } catch (error) {
      toast.error("Failed to update session");
    }
  };

  const handleClone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await cloneSession({ sessionId: session._id });
      toast.success("Session cloned successfully");
    } catch (error) {
      console.error("Clone error:", error);
      toast.error(`Failed to clone session: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this session? This will delete all elements and responses.")) {
      try {
        await deleteSession({ sessionId: session._id });
        toast.success("Session deleted");
      } catch (error) {
        toast.error("Failed to delete session");
      }
    }
  };

  const participantUrl = `${window.location.origin}/input?session=${session.sessionCode}`;
  const resultsUrl = `${window.location.origin}/output?session=${session.sessionCode}`;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{session.title}</h3>
          {session.description && (
            <p className="text-gray-600 text-sm mt-1">{session.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              session.isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {session.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="text-sm text-gray-600">
          <strong>Session Code:</strong> {session.sessionCode}
        </div>
        <div className="text-xs text-gray-500">
          <div>Participate: <code className="bg-gray-100 px-1 rounded">{participantUrl}</code></div>
          <div>Results: <code className="bg-gray-100 px-1 rounded">{resultsUrl}</code></div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleToggleActive}
          className={`flex-1 px-3 py-2 text-sm rounded ${
            session.isActive
              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
              : "bg-green-100 text-green-800 hover:bg-green-200"
          } transition-colors`}
        >
          {session.isActive ? "Deactivate" : "Activate"}
        </button>
        <button
          onClick={handleClone}
          className="px-3 py-2 text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 rounded transition-colors"
          title="Clone this session"
        >
          Clone
        </button>
        <button
          onClick={handleDelete}
          className="px-3 py-2 text-sm bg-red-100 text-red-800 hover:bg-red-200 rounded transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
