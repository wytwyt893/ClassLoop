export function TermsOfUse() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <a href="/" className="text-sm font-semibold text-blue-600 hover:underline">← 返回 ClassLoop</a>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Prototype Usage Notes</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">原型使用说明</h1>
        <div className="mt-8 space-y-6 text-slate-700">
          <section><h2 className="text-lg font-bold">用途</h2><p className="mt-2 leading-7">本版本用于 ClassLoop 的界面、课堂流程和数据结构验证，不属于生产级教学系统。</p></section>
          <section><h2 className="text-lg font-bold">账号与安全</h2><p className="mt-2 leading-7">本地注册仅用于演示，密码以浏览器本地数据形式保存，没有生产环境所需的加密、服务端校验和账号恢复能力。</p></section>
          <section><h2 className="text-lg font-bold">统计与 AI</h2><p className="mt-2 leading-7">正确率、人数和答案分布由本地普通程序计算。当前误区面板是规则演示，不代表 AI 已经给出教学诊断。</p></section>
          <section><h2 className="text-lg font-bold">开源前端归属</h2><p className="mt-2 leading-7">ClassLoop 前端基于 PollUP 的页面结构和组件改造。正式分发前需补齐经上游核验的许可证文本并保留作者归属。</p></section>
        </div>
        <div className="mt-10 rounded-2xl bg-blue-50 p-5 text-sm leading-6 text-blue-900">如需用于真实课堂，应先接入 ClassLoop 后端、正式鉴权与数据库，并完成安全、隐私和教学流程验收。</div>
      </article>
    </main>
  );
}
