import { useState } from "react";
import { toast, Toaster } from "sonner";
import { lookupPublicSession } from "../services/dataProvider";

export function StudentEntry() {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const join = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error("请输入有效的 6 位课堂码");
      return;
    }
    setChecking(true);
    try {
      const session = await lookupPublicSession(code);
      if (!session) {
        toast.error(`未找到课堂码 ${code}，请向教师确认后重试`);
        return;
      }
      if (!session.isActive) {
        toast.warning("已找到课堂，但教师尚未开放答题");
        return;
      }
      window.location.href = `/input?session=${code}`;
    } catch {
      toast.error("暂时无法连接课堂数据库，请确认后端服务已启动");
    } finally {
      setChecking(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-100 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <a href="/" className="text-sm font-bold text-blue-700">← 返回三入口主页</a>
        <div className="mt-10 rounded-[2rem] border border-white bg-white/90 p-7 shadow-xl shadow-blue-200/50 sm:p-9">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-4xl">🎒</span>
          <p className="mt-7 text-xs font-bold tracking-[0.2em] text-blue-600">学生入口</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">加入课堂</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">先输入教师提供的课堂码，验证成功后再选择临时头像和用户名。</p>
          <form onSubmit={join} className="mt-7">
            <label htmlFor="student-code" className="text-sm font-bold text-slate-700">6 位课堂码</label>
            <input id="student-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoFocus className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 text-center font-mono text-2xl tracking-[0.35em] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="000000" />
            <button disabled={code.length !== 6 || checking} className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50">{checking ? "正在查询课堂…" : "验证课堂码"}</button>
          </form>
          <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">无需学生账号。临时用户名和头像在退出课堂后清除。</p>
        </div>
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}
