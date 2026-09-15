import { SignInForm } from "../SignInForm";
import { Toaster } from "sonner";

export function TeacherEntry() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <a href="/" className="text-sm font-bold text-cyan-300">← 返回三入口主页</a>
        <div className="mt-10 rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-4xl">🧑‍🏫</span>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Teacher Workspace</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">教师登录 / 注册</h1>
          <p className="mb-7 mt-3 text-sm leading-6 text-slate-500">教师邮箱是唯一账号标识，账号与密码哈希长期保存在关系数据库。</p>
          <SignInForm />
          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-xs text-blue-900"><strong>演示账号</strong><br />teacher@classloop.local<br />classloop123</div>
        </div>
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}
