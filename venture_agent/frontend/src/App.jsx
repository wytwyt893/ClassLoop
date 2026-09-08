import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import StudentWorkspace from './pages/StudentWorkspace';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminMatrix from './pages/AdminMatrix';
import { buildApiUrl } from './config/api';
import './index.css';

function Portal() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalType, setModalType] = useState('login'); // 'login' or 'register'
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [school, setSchool] = useState('');
  const [major, setMajor] = useState('');
  const [grade, setGrade] = useState('');
  const [targetRole, setTargetRole] = useState('/student');
  const [username, setUsername] = useState(''); // 登录时输入学号/工号
  const [password, setPassword] = useState('');
  const [realName, setRealName] = useState('');
  const [idNum, setIdNum] = useState(''); // 注册时输入的学号/工号
  const [regPassword, setRegPassword] = useState(''); // 注册时设置密码
  const [confirmPassword, setConfirmPassword] = useState(''); // 确认密码
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleCardClick = (path) => {
    setTargetRole(path);
    setShowLoginModal(true);
    setModalType('login');
  };

  const handleAuthTextToggle = (show) => {
    setShowPassword(show);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('学号/工号或密码不能为空');
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    try {
      // 登录流：调用后端接口
      const response = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('va_username', data.username);
        localStorage.setItem('va_realname', data.real_name);
        localStorage.setItem('va_token', data.token);
        localStorage.setItem('va_college', data.college);
        localStorage.setItem('va_major', data.major || '');
        localStorage.setItem('va_grade', data.grade || '');
        
        const finalRole = data.role || (targetRole === '/teacher' ? 'teacher' : 'student');
        localStorage.setItem('va_role', finalRole);
        
        if (data.teacher_id) {
          localStorage.setItem('va_teacher_id', data.teacher_id);
        }
        
        const actualPath = finalRole === 'admin' ? '/admin' : (finalRole === 'teacher' ? '/teacher' : '/student');
        navigate(actualPath);
      } else {
        setErrorMsg(data.detail || '登录失败，请检查学号/工号或密码');
      }
    } catch (err) {
      setErrorMsg('认证失败，请检查网络或尝试重新登录');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!realName || !idNum || !school || !regPassword || !confirmPassword) {
      setErrorMsg('请填写完整的注册信息');
      return;
    }
    if (regPassword !== confirmPassword) {
      setErrorMsg('两次输入的密码不一致');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('密码长度不能少于 6 位');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        role: targetRole === '/admin' ? 'admin' : (targetRole === '/teacher' ? 'teacher' : 'student'),
        real_name: realName,
        id_num: idNum,
        password: regPassword,
        college: school,
        major: targetRole === '/student' ? major : null,
        grade: targetRole === '/student' ? grade : null
      };

      const response = await fetch(buildApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('va_username', idNum);
        localStorage.setItem('va_realname', realName);
        localStorage.setItem('va_college', school);
        localStorage.setItem('va_major', payload.major || '');
        localStorage.setItem('va_grade', payload.grade || '');
        localStorage.setItem('va_token', idNum); 
        
        const finalRole = payload.role;
        localStorage.setItem('va_role', finalRole);
        
        setShowLoginModal(false);
        setShowOnboarding(false);
        navigate(finalRole === 'admin' ? '/admin' : (finalRole === 'teacher' ? '/teacher' : '/student'));
      } else {
        setErrorMsg(data.detail || '注册失败，请稍后重试');
      }
    } catch (err) {
      setErrorMsg('提交失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fcfcfd] flex flex-col items-center py-20 px-6 font-['Inter'] selection:bg-blue-100">
      
      {/* 顶部标题区 */}
      <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-white border border-gray-100 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/5 ring-4 ring-blue-50/50 group hover:scale-110 transition-transform duration-500">
            <span className="text-blue-600 text-4xl font-black">V</span>
          </div>
        </div>
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-6">
          VentureAgent
          <span className="font-thin text-slate-300 mx-3">/</span>
          <span className="font-medium text-slate-500 text-4xl tracking-tight">智能体驱动</span>
        </h1>
        <p className="text-xl text-slate-400 font-light max-w-2xl mx-auto leading-relaxed">
          您的全天候商业逻辑教练。极简、智能、专业。
        </p>
      </div>

      <div className="w-full max-w-7xl px-4 mb-24">
        {/* 卡片区 */}
        <div className="grid md:grid-cols-3 gap-10">
          
          {/* 学生卡片 */}
          <div 
            onClick={() => handleCardClick('/student')} 
            className="group relative bg-white border border-gray-100 p-12 rounded-[3.5rem] shadow-sm hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center text-center cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-blue-50/50 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                <span className="text-5xl">🎯</span>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight group-hover:text-blue-600 transition-colors">学生端 Coach</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-10 px-4 group-hover:text-slate-500 transition-colors">
                沉浸式打磨商业逻辑，实时获取 AI 导师的反馈与改进建议。
              </p>
              <div className="mt-auto inline-flex py-3 px-8 rounded-full bg-slate-50 text-slate-500 text-sm font-semibold group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-200 transition-all duration-300 transform group-hover:translate-x-1">
                开启训练
                <span className="ml-2 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">→</span>
              </div>
            </div>
          </div>

          {/* 教师卡片 */}
          <div 
            onClick={() => handleCardClick('/teacher')} 
            className="group relative bg-white border border-gray-100 p-12 rounded-[3.5rem] shadow-sm hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center text-center cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 to-emerald-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-emerald-50/50 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                <span className="text-5xl">📊</span>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight group-hover:text-emerald-600 transition-colors">教师端 Admin</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-10 px-4 group-hover:text-slate-500 transition-colors">
                全局监控项目进度，通过数据图谱识别潜在商业风险。
              </p>
              <div className="mt-auto inline-flex py-3 px-8 rounded-full bg-slate-50 text-slate-500 text-sm font-semibold group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-200 transition-all duration-300 transform group-hover:translate-x-1">
                管理中心
                <span className="ml-2 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">→</span>
              </div>
            </div>
          </div>

          {/* 管理员卡片 - 替换原有旧版入口 */}
          <div 
            onClick={() => handleCardClick('/admin')} 
            className="group relative bg-white border border-gray-100 p-12 rounded-[3.5rem] shadow-sm hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center text-center cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/0 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-purple-50/50 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                <span className="text-5xl">🛡️</span>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight group-hover:text-purple-600 transition-colors">系统管理 Admin</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-10 px-4 group-hover:text-slate-500 transition-colors">
                最高权限管理矩阵。监控全站数据流，统筹跨院系项目的孵化态势。
              </p>
              <div className="mt-auto inline-flex py-3 px-8 rounded-full bg-slate-50 text-slate-500 text-sm font-semibold group-hover:bg-purple-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-purple-200 transition-all duration-300 transform group-hover:translate-x-1">
                特权进入
                <span className="ml-2 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">→</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 登录/注册 Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md relative animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
            <button 
              onClick={() => {setShowLoginModal(false); setShowOnboarding(false);}}
              className="absolute top-6 right-8 text-slate-300 hover:text-slate-600 transition-colors text-2xl"
            >
              ×
            </button>
            
            {!showOnboarding ? (
              <>
                <div className="text-center mb-10">
                  <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-sm ${targetRole === '/student' ? 'bg-blue-50 text-blue-600' : targetRole === '/teacher' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                    <span className="text-3xl">{targetRole === '/student' ? '🎓' : targetRole === '/teacher' ? '👨‍🏫' : '🛡️'}</span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mb-2">
                    {modalType === 'login' ? '欢迎回来' : '开启新征程'}
                  </h2>
                  <p className="text-sm text-slate-400 font-medium">
                    {modalType === 'login' ? '请登录以访问您的智能体助手' : '创建一个账号以获取 AI 导师指导'}
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">学号 / 工号</label>
                    <input 
                      type="text" 
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all placeholder-slate-300 shadow-inner"
                      placeholder="请输入学号或工号"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">密码</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all pr-12 placeholder-slate-300 shadow-inner"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onMouseDown={() => handleAuthTextToggle(true)}
                        onMouseUp={() => handleAuthTextToggle(false)}
                        onMouseLeave={() => handleAuthTextToggle(false)}
                        onTouchStart={() => handleAuthTextToggle(true)}
                        onTouchEnd={() => handleAuthTextToggle(false)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 focus:outline-none transition-colors"
                      >
                        <span className="material-symbols-outlined text-[22px]">
                          {showPassword ? 'visibility' : 'visibility_off'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="bg-red-50 text-red-600 px-5 py-3 rounded-2xl text-xs font-bold border border-red-100 animate-in shake duration-300">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-4 mt-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 ${isLoading ? 'bg-slate-400 cursor-not-allowed' : (targetRole === '/student' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : targetRole === '/teacher' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200')}`}
                  >
                    {isLoading ? '验证中...' : (modalType === 'login' ? '登 录' : '注 册')}
                  </button>
                </form>

                <div className="mt-8 text-center text-[13px] text-slate-400 font-medium">
                  {modalType === 'login' ? (
                    <span>还没有账号？ <button type="button" onClick={() => {setShowOnboarding(true); setErrorMsg('');}} className="text-blue-600 font-bold hover:underline">立即注册</button></span>
                  ) : (
                    <span>已有账号？ <button type="button" onClick={() => {setModalType('login'); setErrorMsg('');}} className="text-blue-600 font-bold hover:underline">返回登录</button></span>
                  )}
                </div>
              </>
            ) : (
              // Onboarding 表单
              <div className="animate-in slide-in-from-right-10 duration-500">
                <div className="text-center mb-10">
                  <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl ${targetRole === '/student' ? 'bg-blue-600 shadow-blue-200' : 'bg-emerald-600 shadow-emerald-200'} text-white`}>
                    <span className="material-symbols-outlined text-4xl">edit_note</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">完善实名注册信息</h2>
                  <p className="text-xs text-slate-400">请确保填写的信息与真实证件一致，以便通过成员校验</p>
                </div>

                <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">真实姓名</label>
                      <input 
                        type="text" 
                        value={realName}
                        onChange={e => setRealName(e.target.value)}
                        className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm focus:bg-white focus:ring-4 transition-all ${targetRole === '/student' ? 'focus:ring-blue-50 focus:border-blue-400' : 'focus:ring-emerald-50 focus:border-emerald-400'}`}
                        placeholder="姓名"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{targetRole === '/student' ? '学号' : '教师工号'}</label>
                      <input 
                        type="text" 
                        value={idNum}
                        onChange={e => setIdNum(e.target.value)}
                        className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm focus:bg-white focus:ring-4 transition-all ${targetRole === '/student' ? 'focus:ring-blue-50 focus:border-blue-400' : 'focus:ring-emerald-50 focus:border-emerald-400'}`}
                        placeholder="ID 号"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">所属学院</label>
                    <input 
                      type="text" 
                      value={school}
                      onChange={e => setSchool(e.target.value)}
                      className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm focus:bg-white focus:ring-4 transition-all ${targetRole === '/student' ? 'focus:ring-blue-50 focus:border-blue-400' : 'focus:ring-emerald-50 focus:border-emerald-400'}`}
                      placeholder="例如：计算机学院"
                    />
                  </div>
                  {targetRole === '/student' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">所属专业</label>
                        <input 
                          type="text" 
                          value={major}
                          onChange={e => setMajor(e.target.value)}
                          className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm focus:bg-white focus:ring-4 transition-all ${targetRole === '/student' ? 'focus:ring-blue-50 focus:border-blue-400' : 'focus:ring-emerald-50 focus:border-emerald-400'}`}
                          placeholder="例如：软件工程"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">当前年级</label>
                        <select
                          value={grade}
                          onChange={e => setGrade(e.target.value)}
                          className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm focus:bg-white focus:ring-4 transition-all appearance-none ${targetRole === '/student' ? 'focus:ring-blue-50 focus:border-blue-400' : 'focus:ring-emerald-50 focus:border-emerald-400'}`}
                        >
                          <option value="">请选择年级...</option>
                          <option value="大一">大一</option>
                          <option value="大二">大二</option>
                          <option value="大三">大三</option>
                          <option value="大四">大四</option>
                          <option value="研一">研一</option>
                          <option value="研二">研二</option>
                          <option value="研三">研三</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">设置密码</label>
                      <div className="relative">
                        <input 
                          type={showRegPass ? "text" : "password"} 
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm focus:bg-white focus:ring-4 transition-all pr-12 ${targetRole === '/student' ? 'focus:ring-blue-50 focus:border-blue-400' : 'focus:ring-emerald-50 focus:border-emerald-400'}`}
                          placeholder="请输入密码"
                        />
                        <button 
                          type="button"
                          onMouseDown={() => setShowRegPass(true)}
                          onMouseUp={() => setShowRegPass(false)}
                          onMouseLeave={() => setShowRegPass(false)}
                          onTouchStart={() => setShowRegPass(true)}
                          onTouchEnd={() => setShowRegPass(false)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">{showRegPass ? 'visibility' : 'visibility_off'}</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">确认密码</label>
                      <div className="relative">
                        <input 
                          type={showConfirmPass ? "text" : "password"} 
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-sm focus:bg-white focus:ring-4 transition-all pr-12 ${targetRole === '/student' ? 'focus:ring-blue-50 focus:border-blue-400' : 'focus:ring-emerald-50 focus:border-emerald-400'}`}
                          placeholder="再次输入"
                        />
                        <button 
                          type="button"
                          onMouseDown={() => setShowConfirmPass(true)}
                          onMouseUp={() => setShowConfirmPass(false)}
                          onMouseLeave={() => setShowConfirmPass(false)}
                          onTouchStart={() => setShowConfirmPass(true)}
                          onTouchEnd={() => setShowConfirmPass(false)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">{showConfirmPass ? 'visibility' : 'visibility_off'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="text-red-500 text-[11px] font-bold animate-pulse text-center">{errorMsg}</div>
                  )}

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-4 mt-6 rounded-2xl text-white font-black text-sm tracking-widest transition-all shadow-xl active:scale-95 disabled:bg-slate-300 ${targetRole === '/student' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                  >
                    {isLoading ? '提交中...' : '开 始 体 验'}
                  </button>
                </form>

                <div className="mt-6 text-center text-[13px] text-slate-400 font-medium pb-2">
                  已有账号？ <button type="button" onClick={() => {setShowOnboarding(false); setModalType('login'); setErrorMsg('');}} className={`${targetRole === '/student' ? 'text-blue-600' : 'text-emerald-600'} font-bold hover:underline`}>返回登录</button>
                </div>
              </div>
            )}

            {/* 这里的冗余跳转已移除，统一使用表单下方的切换逻辑 */}
          </div>
        </div>
      )}

    </div>
  );
}

// 简单的路由守卫组件
function RoleGuard({ children, requiredRole }) {
  const username = localStorage.getItem('va_username');
  const role = localStorage.getItem('va_role');
  
  if (!username) return <Navigate to="/" replace />;
  
  // 角色严控：路径与角色必须精准匹配
  if (requiredRole === 'admin' && role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  if (requiredRole === 'teacher' && role !== 'teacher') {
    return <Navigate to="/student" replace />;
  }
  if (requiredRole === 'student' && (role === 'teacher' || role === 'admin')) {
    const defaultPath = role === 'teacher' ? '/teacher' : '/admin';
    return <Navigate to={defaultPath} replace />;
  }
  
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portal />} />
        <Route 
          path="/student" 
          element={
            <RoleGuard requiredRole="student">
              <StudentWorkspace />
            </RoleGuard>
          } 
        />
        <Route 
          path="/teacher" 
          element={
            <RoleGuard requiredRole="teacher">
              <TeacherDashboard />
            </RoleGuard>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <RoleGuard requiredRole="admin">
              <AdminMatrix />
            </RoleGuard>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
