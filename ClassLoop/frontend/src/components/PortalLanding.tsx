import { useState } from "react";
import { toast, Toaster } from "sonner";
import { lookupPublicSession } from "../services/dataProvider";

const portals = [
  {
    href: "/student",
    icon: "🎒",
    eyebrow: "学生入口",
    title: "学生进入课堂",
    description: "输入课堂码，选择临时头像与用户名，参与 Micro Check。",
    accent: "from-cyan-400 to-blue-500",
  },
  {
    href: "/teacher",
    icon: "🧑‍🏫",
    eyebrow: "教师入口",
    title: "教师工作台",
    description: "注册或登录教师账号，创建课堂、题目并查看认知反馈。",
    accent: "from-blue-500 to-indigo-600",
  },
  {
    href: "/admin",
    icon: "🗄️",
    eyebrow: "管理员入口",
    title: "数据库管理视图",
    description: "只读查看教师账号、课堂、题目与回答统计。",
    accent: "from-violet-500 to-fuchsia-600",
  },
  {
    href: "/acceptance",
    icon: "🎯",
    eyebrow: "最终验收",
    title: "三站验收演示中心",
    description: "项目逻辑、F1/F2/F3随机抽测、V1→V2与证据索引一页切换。",
    accent: "from-amber-400 to-orange-600",
  },
] as const;

export function PortalLanding() {
  const [code, setCode] = useState("240805");
  const [checking, setChecking] = useState(false);
  const join = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast.error("请输入 6 位课堂码");
      return;
    }
    setChecking(true);
    try {
      const session = await lookupPublicSession(code);
      if (!session) {
        toast.error(`未找到课堂码 ${code}`);
        return;
      }
      if (!session.isActive) {
        toast.warning("课堂存在，但教师尚未开放答题");
        return;
      }
      window.location.href = `/input?session=${code}`;
    } catch {
      toast.error("无法连接课堂数据库，请确认后端服务已启动");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-[32rem] w-[32rem] rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
      </div>
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-10">
        <a href="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-xl font-black">CL</span>
          <span><strong className="block text-xl">ClassLoop</strong><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">认知反馈课堂</span></span>
        </a>
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300">入口选择不读取账号状态</span>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-200">一个首页 · 三种角色 · 同一条课堂数据链路</div>
          <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight sm:text-6xl">请选择你的 ClassLoop 入口</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">学生保持临时匿名，教师账号长期保存，管理员仅查看系统数据概况。</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {portals.map((portal) => (
            <a key={portal.href} href={portal.href} className="group rounded-[2rem] border border-white/10 bg-white/[0.06] p-2 backdrop-blur transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.09]">
              <div className="h-full rounded-[1.6rem] bg-slate-900/70 p-6">
                <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-3xl shadow-lg ${portal.accent}`}>{portal.icon}</div>
                <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">{portal.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-black">{portal.title}</h2>
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">{portal.description}</p>
                <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 font-bold"><span>进入</span><span className="transition-transform group-hover:translate-x-1">→</span></div>
              </div>
            </a>
          ))}
        </div>

        <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:flex-row">
          <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(event) => event.key === "Enter" && join()} aria-label="首页课堂码" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-lg tracking-[0.25em] outline-none focus:border-cyan-400" placeholder="输入 6 位课堂码" />
          <button onClick={() => void join()} disabled={checking} className="rounded-xl bg-white px-6 py-3 font-bold text-slate-950 hover:bg-cyan-50 disabled:opacity-60">{checking ? "正在查询…" : "学生快捷加入"}</button>
        </div>
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
