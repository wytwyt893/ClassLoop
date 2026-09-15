export function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <a href="/" className="text-sm font-semibold text-blue-600 hover:underline">← 返回 ClassLoop</a>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Prototype Privacy Notice</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">隐私与本地数据说明</h1>
        <p className="mt-4 leading-7 text-slate-600">当前 ClassLoop 是用于课程实践的本机全栈原型，前端只连接本机 ClassLoop API，不会把课堂数据发送到 VentureAgent。</p>
        <div className="mt-8 space-y-6 text-slate-700">
          <section><h2 className="text-lg font-bold">数据保存位置</h2><p className="mt-2 leading-7">教师账号、课堂、题目、上传文件与学生回答保存在本机 ClassLoop 后端的 SQLite 数据库中；教师浏览器仅保存登录令牌。学生临时头像和用户名只存在于在线内存名单中，退出或离线超时后清除。</p></section>
          <section><h2 className="text-lg font-bold">演示账号</h2><p className="mt-2 leading-7">演示账号和密码只用于本地功能体验。请不要输入真实生产密码、个人敏感信息或正式教学数据。</p></section>
          <section><h2 className="text-lg font-bold">学生标识</h2><p className="mt-2 leading-7">学生端会在浏览器中生成随机匿名标识，用于关联同一浏览器的多道回答；当前版本不采集真实姓名。</p></section>
          <section><h2 className="text-lg font-bold">后续版本</h2><p className="mt-2 leading-7">接入 FastAPI、SQLite、AI Tutor 或学校账号后，必须重新制定正式的数据最小化、访问控制、保留期限和告知同意方案。</p></section>
        </div>
        <p className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">最后更新：2026-08-31 · 本说明仅适用于当前本地 MVP。</p>
      </article>
    </main>
  );
}
