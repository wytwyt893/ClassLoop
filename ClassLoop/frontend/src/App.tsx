import { useState } from "react";
import { useConvexAuth, useCurrentUser } from "./services/dataProvider";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Dashboard } from "./components/Dashboard";
import { ParticipantView } from "./components/ParticipantView";
import { ResultsView } from "./components/ResultsView";
import { TimerView } from "./components/TimerView";
import { Footer } from "./components/Footer";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { TermsOfUse } from "./components/TermsOfUse";
import { PortalLanding } from "./components/PortalLanding";
import { StudentEntry } from "./components/StudentEntry";
import { TeacherEntry } from "./components/TeacherEntry";
import { AdminDatabaseView, AdminSignIn } from "./components/AdminView";
import { Toaster, toast } from "sonner";

function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <a href="/" className="flex items-center gap-3 group">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-200 transition-transform group-hover:-rotate-3">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3H20v15H8.5A3.5 3.5 0 0 0 5 21.5v-15Z" />
          <path d="M5 18V6.5A3.5 3.5 0 0 0 1.5 3H1v15h.5A3.5 3.5 0 0 1 5 21.5" />
          <path d="m9 10 2 2 4-5" />
        </svg>
      </span>
      <span>
        <strong className={`block text-xl tracking-tight ${inverse ? "text-white" : "text-slate-950"}`}>ClassLoop</strong>
        <span className={`block text-[10px] font-semibold uppercase tracking-[0.18em] ${inverse ? "text-cyan-300" : "text-blue-600"}`}>认知反馈课堂</span>
      </span>
    </a>
  );
}

function PublicLanding() {
  const [sessionCode, setSessionCode] = useState("240805");

  const join = () => {
    const code = sessionCode.trim();
    if (!/^\d{6}$/.test(code)) {
      toast.error("请输入 6 位课堂码");
      return;
    }
    window.location.href = `/input?session=${code}`;
  };

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-16 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-[32rem] w-[32rem] rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Logo inverse />
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          SQLite 持久化版 · 前后端数据已连通
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-10 lg:pt-16">
        <section>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-200">
            <span className="rounded-full bg-blue-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">MVP</span>
            数据结构 · 树 / BST / AVL
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            不止收集答案，
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">让课堂形成反馈闭环</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            教师发起 Micro Check，学生即时作答；系统汇总共性错误，支持教学干预与变式复测。账号、课堂和回答均由本地数据库持久保存。
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["01", "课堂初测", "单选、多选与开放回答"],
              ["02", "实时证据", "参与人数与答案分布"],
              ["03", "干预复测", "为后续 AI 分析预留接口"],
            ].map(([number, title, detail]) => (
              <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <span className="text-xs font-bold text-cyan-300">{number}</span>
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">{detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label htmlFor="session-code" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">学生使用课堂码加入</label>
              <input
                id="session-code"
                value={sessionCode}
                onChange={(event) => setSessionCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(event) => event.key === "Enter" && join()}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-xl tracking-[0.35em] text-white outline-none transition focus:border-blue-400"
                inputMode="numeric"
                aria-label="6 位课堂码"
              />
            </div>
            <button onClick={join} className="mt-5 rounded-xl bg-white px-6 py-3 font-bold text-slate-950 transition hover:bg-blue-50 sm:self-end">进入课堂 →</button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white p-2 text-slate-900 shadow-2xl shadow-blue-950/50">
          <div className="rounded-[1.6rem] bg-slate-50 p-6 sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Teacher Workspace</p>
              <h2 className="mt-2 text-2xl font-black">教师登录 / 注册</h2>
              <p className="mt-2 text-sm text-slate-500">创建课堂、管理题目并查看实时结果。</p>
            </div>
            <SignInForm />
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-bold">演示教师账号</p>
              <p className="mt-1 font-mono text-xs">teacher@classloop.local</p>
              <p className="font-mono text-xs">classloop123</p>
              <div className="mt-3 flex gap-2">
                <a href="/output?session=240805" className="font-semibold text-blue-700 hover:underline">查看演示结果</a>
                <span className="text-blue-300">·</span>
                <a href="/timer" className="font-semibold text-blue-700 hover:underline">打开计时器</a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}

function TeacherShell() {
  const { user } = useCurrentUser();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="flex items-center gap-3">
            <a href="/input?session=240805" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:block">学生端预览</a>
            <a href="/output?session=240805" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:block">结果看板</a>
            <div className="hidden text-right md:block">
              <p className="text-sm font-bold text-slate-800">{user?.name ?? "教师"}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="py-8 sm:py-10"><Dashboard /></main>
      <Footer />
      <Toaster richColors position="top-center" />
    </div>
  );
}

function TeacherRoute() {
  const { user } = useCurrentUser();
  const { isLoading } = useConvexAuth();
  if (isLoading) return <div className="grid min-h-screen place-items-center text-slate-500">正在恢复登录状态…</div>;
  if (!user || user.role !== "teacher") return <TeacherEntry />;
  return <TeacherShell />;
}

function AdminRoute() {
  const { user } = useCurrentUser();
  const { isLoading } = useConvexAuth();
  if (isLoading) return <div className="grid min-h-screen place-items-center text-slate-500">正在恢复登录状态…</div>;
  if (!user || user.role !== "admin") return <AdminSignIn />;
  return <AdminDatabaseView />;
}

function App() {
  const path = window.location.pathname;
  if (path === "/student") return <StudentEntry />;
  if (path === "/teacher") return <TeacherRoute />;
  if (path === "/admin") return <AdminRoute />;
  if (path === "/input") return <><ParticipantView /><Toaster richColors position="top-center" /></>;
  if (path === "/output") return <><ResultsView /><Toaster richColors position="top-center" /></>;
  if (path === "/timer") return <><TimerView /><Toaster richColors position="top-center" /></>;
  if (path === "/privacy") return <><PrivacyPolicy /><Footer /><Toaster /></>;
  if (path === "/terms") return <><TermsOfUse /><Footer /><Toaster /></>;

  return <PortalLanding />;
}

export default App;
