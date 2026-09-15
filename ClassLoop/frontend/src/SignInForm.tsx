"use client";
import { useAuthActions } from "./services/dataProvider";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full">
      <form className="flex flex-col gap-4" onSubmit={(event) => {
        event.preventDefault();
        setSubmitting(true);
        const formData = new FormData(event.currentTarget);
        formData.set("flow", flow);
        void signIn("password", formData).catch((error) => {
          const message = String(error instanceof Error ? error.message : error);
          if (message.includes("Invalid")) toast.error("账号或密码不正确");
          else if (message.includes("exists")) toast.error("该邮箱已经注册");
          else if (message.includes("6 characters")) toast.error("密码至少需要 6 位");
          else toast.error(flow === "signIn" ? "登录失败，请检查账号" : "注册失败，请稍后重试");
          setSubmitting(false);
        });
      }}>
        {flow === "signUp" && <label className="space-y-2"><span className="text-sm font-semibold text-slate-700">教师姓名</span><input className="auth-input-field" type="text" name="name" placeholder="例如：张老师" required /></label>}
        <label className="space-y-2"><span className="text-sm font-semibold text-slate-700">邮箱</span><input className="auth-input-field" type="email" name="email" placeholder="teacher@example.com" autoComplete="email" required /></label>
        <label className="space-y-2"><span className="text-sm font-semibold text-slate-700">密码</span><input className="auth-input-field" type="password" name="password" placeholder="至少 6 位" autoComplete={flow === "signIn" ? "current-password" : "new-password"} required /></label>
        <button className="auth-button mt-1" type="submit" disabled={submitting}>{submitting ? "正在处理…" : flow === "signIn" ? "进入教师工作台" : "创建教师账号"}</button>
        <div className="text-center text-sm text-slate-500">
          <span>{flow === "signIn" ? "还没有账号？" : "已经有账号？"}</span>{" "}
          <button type="button" className="cursor-pointer font-semibold text-blue-600 hover:underline" onClick={() => { setFlow(flow === "signIn" ? "signUp" : "signIn"); setSubmitting(false); }}>{flow === "signIn" ? "立即注册" : "返回登录"}</button>
        </div>
      </form>
      <div className="my-4 flex items-center justify-center"><hr className="grow border-slate-200" /><span className="mx-4 text-xs text-slate-400">快速体验</span><hr className="grow border-slate-200" /></div>
      <button className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50" onClick={() => void signIn("anonymous")}>使用临时教师身份</button>
      <p className="mt-3 text-center text-xs leading-5 text-slate-400">账号密码经过服务端哈希处理，课堂与回答保存在本机 SQLite 数据库。</p>
    </div>
  );
}
