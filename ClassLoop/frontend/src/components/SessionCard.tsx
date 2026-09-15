import { api, useMutation } from "../services/dataProvider";
import { Doc } from "../services/types";
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
      toast.success(session.isActive ? "课堂已暂停" : "课堂已开放");
    } catch (error) {
      toast.error("课堂更新失败，请稍后重试");
    }
  };

  const handleClone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await cloneSession({ sessionId: session._id });
      toast.success("课堂已复制");
    } catch (error) {
      console.error("Clone error:", error);
      toast.error(`复制课堂失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("确定删除该课堂吗？题目和回答也会一并删除。")) {
      try {
        await deleteSession({ sessionId: session._id });
        toast.success("课堂已删除");
      } catch (error) {
        toast.error("删除课堂失败，请稍后重试");
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
            {session.isActive ? "进行中" : "未开放"}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="text-sm text-gray-600">
          <strong>课堂码：</strong> {session.sessionCode}
        </div>
        <div className="text-xs text-gray-500">
          <div>学生端：<code className="bg-gray-100 px-1 rounded">{participantUrl}</code></div>
          <div>结果页：<code className="bg-gray-100 px-1 rounded">{resultsUrl}</code></div>
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
          {session.isActive ? "暂停" : "开放"}
        </button>
        <button
          onClick={handleClone}
          className="px-3 py-2 text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 rounded transition-colors"
          title="Clone this session"
        >
          复制
        </button>
        <button
          onClick={handleDelete}
          className="px-3 py-2 text-sm bg-red-100 text-red-800 hover:bg-red-200 rounded transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  );
}
