import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserProfileModal from '../components/UserProfileModal';
import {
  Table, Tag, Badge, Progress, Card, Button, 
  Statistic, Empty, Spin, Slider, message as antMessage,
  Tabs, Input, Modal, Descriptions, List, Avatar
} from 'antd';
import {
  DashboardOutlined,
  WarningOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  SearchOutlined,
  LogoutOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  SendOutlined,
  AuditOutlined,
  LineChartOutlined,
  ProjectOutlined,
  UserOutlined,
  BookOutlined,
  SyncOutlined,
  EditOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { buildApiUrl } from '../config/api';

const { TabPane } = Tabs;
const { TextArea } = Input;

const RadarChart = ({ data }) => {
  if (!data) return null;
  const scores = [
    data.r1_score || data.r1 || 0, data.r2_score || data.r2 || 0, 
    data.r3_score || data.r3 || 0, data.r4_score || data.r4 || 0, 
    data.r5_score || data.r5 || 0, data.r6_score || data.r6 || 0,
    data.r7_score || data.r7 || 0, data.r8_score || data.r8 || 0,
    data.r9_score || data.r9 || 0
  ];
  const labels = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9"];
  const centerX = 100, centerY = 100, radius = 70;
  const points = scores.map((s, i) => {
    const angle = (Math.PI * 2 * i) / 9 - Math.PI / 2;
    const r = (s / 5) * radius;
    return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
  }).join(' ');

  return (
    <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto overflow-visible">
      {/* 网格线 */}
      {[1, 2, 3, 4, 5].map(tick => (
        <polygon 
          key={tick}
          points={labels.map((_, i) => {
            const angle = (Math.PI * 2 * i) / 9 - Math.PI / 2;
            const r = (tick / 5) * radius;
            return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
          }).join(' ')}
          fill="none" stroke="#e2e8f0" strokeWidth="1"
        />
      ))}
      <polygon points={points} fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="2" />
      {labels.map((l, i) => {
        const angle = (Math.PI * 2 * i) / 9 - Math.PI / 2;
        const x = centerX + (radius + 15) * Math.cos(angle);
        const y = centerY + (radius + 15) * Math.sin(angle);
        return <text key={l} x={x} y={y} fontSize="10" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle" fill="#94a3b8">{l}</text>;
      })}
    </svg>
  );
};

const RUBRIC_DIMENSIONS = [
  { label: 'R1 问题定义', key: 'r1_score' },
  { label: 'R2 用户证据', key: 'r2_score' },
  { label: 'R3 方案可行性', key: 'r3_score' },
  { label: 'R4 商业模式', key: 'r4_score' },
  { label: 'R5 市场竞争', key: 'r5_score' },
  { label: 'R6 财务逻辑', key: 'r6_score' },
  { label: 'R7 创新差异化', key: 'r7_score' },
  { label: 'R8 团队执行力', key: 'r8_score' },
  { label: 'R9 表达材料', key: 'r9_score' }
];

const DEFAULT_RUBRIC_WEIGHTS = RUBRIC_DIMENSIONS.reduce((acc, item) => {
  acc[item.key] = 1;
  return acc;
}, {});

const toRubricScore = (assessment, key) => {
  const raw = assessment?.[key];
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
};

const computeWeightedScore = (assessment, weights) => {
  const totalWeight = RUBRIC_DIMENSIONS.reduce((sum, item) => sum + Number(weights?.[item.key] ?? 0), 0);
  if (!totalWeight) return 0;
  const weightedSum = RUBRIC_DIMENSIONS.reduce((sum, item) => {
    return sum + toRubricScore(assessment, item.key) * Number(weights?.[item.key] ?? 0);
  }, 0);
  return weightedSum / totalWeight;
};

const getComputedRiskLevel = (weightedScore) => {
  if (weightedScore <= 2.5) return 'High';
  if (weightedScore <= 4) return 'Medium';
  if (weightedScore <= 5) return 'Low';
  return 'PENDING';
};

const getRiskTagColor = (riskLevel) => {
  if (riskLevel === 'High') return 'red';
  if (riskLevel === 'Medium') return 'orange';
  if (riskLevel === 'Low') return 'green';
  return 'default';
};

const formatEvidenceTrace = (trace) => {
  const normalized = String(trace || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\r/g, '')
    .replace(/\s+(?=(?:\d+[\.、\)])|(?:[①②③④⑤⑥⑦⑧⑨⑩]))/g, '\n\n')
    .trim();

  if (!normalized) return [];

  const numberedLines = normalized
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);

  return numberedLines.length > 0 ? numberedLines : [normalized];
};

const TEAM_PROFILE_LABELS = {
  diversity: "团队多元化",
  agility: "迭代敏捷度",
  coachability: "听劝吸收力",
  resilience: "抗压韧性",
  execution: "调研执行力",
  self_correction: "自纠错能力"
};

const InteractiveTeamRadarChart = ({ profile, onSelectDimension, selectedDimension }) => {
  if (!profile || !profile.scores) return null;
  const metrics = ["diversity", "agility", "coachability", "resilience", "execution", "self_correction"];
  const centerX = 160, centerY = 160, radius = 90;
  
  const points = metrics.map((k, i) => {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const r = (profile.scores[k] / 100) * radius;
    return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
  }).join(' ');

  return (
    <svg width="320" height="320" viewBox="0 0 320 320" className="mx-auto overflow-visible cursor-pointer">
      {[0.2, 0.4, 0.6, 0.8, 1].map(tick => (
        <polygon 
          key={tick}
          points={metrics.map((_, i) => {
            const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
            const r = tick * radius;
            return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
          }).join(' ')}
          fill="none" stroke="#e2e8f0" strokeWidth="1"
        />
      ))}
      <polygon points={points} fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth="2" className="pointer-events-none transition-all duration-500" />
      {metrics.map((m, i) => {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const xText = centerX + (radius + 25) * Math.cos(angle);
        const yText = centerY + (radius + 25) * Math.sin(angle);
        const xHot = centerX + radius * Math.cos(angle);
        const yHot = centerY + radius * Math.sin(angle);
        const isSelected = selectedDimension === m;
        return (
          <g key={m} onClick={() => onSelectDimension(m)} className="group cursor-pointer">
            <line x1={centerX} y1={centerY} x2={xHot} y2={yHot} stroke="transparent" strokeWidth="25" />
            <circle cx={xHot} cy={yHot} r="15" fill={isSelected ? "#6366f1" : "transparent"} className="transition-colors" />
            <text x={xText} y={yText} fontSize="12" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle" className={`transition-colors ${isSelected ? "fill-indigo-600 font-black" : "fill-slate-400 group-hover:fill-indigo-500"}`}>
              {TEAM_PROFILE_LABELS[m]}
            </text>
            <text x={xText} y={yText + 18} fontSize="11" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle" className={`transition-opacity ${isSelected ? "fill-indigo-600 opacity-100" : "fill-indigo-400 opacity-0 group-hover:opacity-100"}`}>
              {profile.scores[m]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('overview'); // 'overview' 或 项目ID
  const [teacherName, setTeacherName] = useState(() => {
    const name = localStorage.getItem('va_realname');
    const id = localStorage.getItem('va_username');
    if (name && name !== 'null' && name !== 'undefined') return name;
    if (id && id !== 'null' && id !== 'undefined') return id;
    return 'Unknown Instructor';
  });
  const [teacherId, setTeacherId] = useState(localStorage.getItem('va_username'));
  const [loading, setLoading] = useState(false);
  
  // 数据状态
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ student_count: 0, project_count: 0, high_risk_count: 0 });
  const [coverage, setCoverage] = useState({});
  const [topMistakes, setTopMistakes] = useState([]);
  const [projectDetail, setProjectDetail] = useState(null);
  const [interventionText, setInterventionText] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [teachingPlan, setTeachingPlan] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState(teacherName);
  const [editId, setEditId] = useState(teacherId);
  const [rubricWeights, setRubricWeights] = useState(DEFAULT_RUBRIC_WEIGHTS);

  const [teamProfile, setTeamProfile] = useState(null);
  const [teamProfileLoading, setTeamProfileLoading] = useState(false);
  const [selectedTeamEvidence, setSelectedTeamEvidence] = useState(null);
  const [selectedDimension, setSelectedDimension] = useState(null);

  useEffect(() => {
    if (!teacherName) {
      navigate('/');
      return;
    }
    fetchDashboardData();
  }, [teacherName, teacherId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl(`/api/teacher/dashboard?teacher_id=${encodeURIComponent(teacherId)}`));
      const data = await res.json();
      setProjects(data.projects || []);
      setStats(data.stats || { student_count: 0, project_count: 0, high_risk_count: 0 });
      setTopMistakes(data.top_mistakes || []);
      
      // 如果当前正在查看某个项目详情，同步刷新详情
      if (activeMenu !== 'overview') {
        await selectProject(parseInt(activeMenu));
      }
    } catch (e) {
      antMessage.error("获取大盘数据失败");
    } finally {
      setLoading(false);
    }
  };

  const selectProject = async (id) => {
    setLoading(true);
    setTeamProfile(null);
    setSelectedTeamEvidence(null);
    setSelectedDimension(null);
    try {
      const res = await fetch(buildApiUrl(`/api/teacher/projects/${id}`));
      if (res.ok) {
        const data = await res.json();
        setProjectDetail(data);
        setActiveMenu(id.toString());
      }
    } catch (e) {
      antMessage.error("获取项目详情失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamProfile = async () => {
    if (!projectDetail) return;
    setTeamProfileLoading(true);
    setTeamProfile(null);
    setSelectedTeamEvidence(null);
    setSelectedDimension(null);
    try {
      const res = await fetch(buildApiUrl(`/api/projects/${projectDetail.project.id}/team-profile`));
      
      if (!res.ok) {
        let errMsg = "生成失败，可能是对话数据还不够，积累3轮带思考的对话试试~";
        try {
           const errData = await res.json();
           if (errData.detail) errMsg = errData.detail;
        } catch(err) {}
        antMessage.warning({ content: errMsg, duration: 4 });
        return;
      }
      
      const data = await res.json();
      setTeamProfile(data.profile);
      antMessage.success("动态画像生成成功！", 3);
    } catch (e) {
      antMessage.error("网络异常或服务出错，生成画像失败", 3);
    } finally {
      setTeamProfileLoading(false);
    }
  };

  const handleSendIntervention = async () => {
    if (!interventionText.trim() || !projectDetail) {
      antMessage.warning("请输入指导建议后再下发");
      return;
    }
    try {
      const res = await fetch(buildApiUrl(`/api/teacher/interventions?project_id=${projectDetail.project.id}&teacher_name=${encodeURIComponent(teacherName)}&content=${encodeURIComponent(interventionText)}`), {
        method: 'POST'
      });
      if (res.ok) {
        antMessage.success("干预锦囊已成功下发");
        setInterventionText('');
      }
    } catch (e) {
      antMessage.error("下发失败");
    }
  };

  const triggerAudit = async () => {
    if (!projectDetail) return;
    setAuditLoading(true);
    try {
      const res = await fetch(buildApiUrl(`/api/teacher/projects/${projectDetail.project.id}/audit`), { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        antMessage.error(data.detail || data.error || "审计触发失败");
        return;
      }

      antMessage.success("AI 深度审计完成");
      await selectProject(projectDetail.project.id);
      await fetchDashboardData();
    } catch (e) {
      antMessage.error("审计触发失败");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleGenerateTeachingPlan = async () => {
    const hasMistakes = topMistakes.length > 0 && (topMistakes[0]?.count || 0) > 0;
    if (!hasMistakes) {
      antMessage.warning("当前暂无可用的高频商业逻辑盲区，暂时无法生成下周干预方案");
      return;
    }

    setPlanLoading(true);
    try {
      const teacherIdentity = teacherId || teacherName;
      const res = await fetch(buildApiUrl(`/api/teacher/weekly-plan?teacher_id=${encodeURIComponent(teacherIdentity)}`));
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        antMessage.error(data.detail || data.error || "下周干预方案生成失败");
        return;
      }

      setTeachingPlan(data.plan || "");
      antMessage.success("下周干预方案已生成");
    } catch (e) {
      antMessage.error("下周干预方案生成失败");
    } finally {
      setPlanLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleSendInterventionAction = async () => {
    if (!interventionText.trim() || !projectDetail) {
      antMessage.warning("请输入指导建议后再下发");
      return;
    }

    try {
      const res = await fetch(buildApiUrl('/api/teacher/interventions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectDetail.project.id,
          teacher_name: teacherName,
          content: interventionText
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        antMessage.error(data.detail || data.message || "下发失败");
        return;
      }

      antMessage.success("指导建议已下发，学生端通知中心将同步显示");
      setInterventionText('');
      await selectProject(projectDetail.project.id);
    } catch (e) {
      antMessage.error("下发失败");
    }
  };

  // 表格定义
  const columns = [
    { 
      title: '项目名称', 
      dataIndex: 'name', 
      key: 'name', 
      className: 'font-bold text-slate-800',
      render: (text) => <span className="text-slate-900">{text}</span>
    },
    { 
      title: '负责人', 
      dataIndex: 'owner_id', 
      key: 'owner_id',
      render: (id) => <Tag icon={<UserOutlined />}>{id}</Tag>
    },
    { 
      title: '风险等级', 
      dataIndex: 'risk_level', 
      render: (lv) => (
        <Badge status={lv === 'High' ? 'error' : lv === 'Medium' ? 'warning' : 'success'} text={lv === 'High' ? '高风险' : lv === 'Medium' ? '中风险' : '正常'} />
      )
    },
    { 
      title: '操作', 
      render: (_, record) => (
        <Button type="primary" size="small" shape="round" onClick={() => selectProject(record.id)}>
          进入辅导
        </Button>
      )
    }
  ];

  const evidenceTraceLines = formatEvidenceTrace(projectDetail?.assessment?.evidence_trace);
  const weightedScore = computeWeightedScore(projectDetail?.assessment, rubricWeights);
  const computedRiskLevel = getComputedRiskLevel(weightedScore);
  const weightedFormulaText = `加权平均分 = (${RUBRIC_DIMENSIONS.map(item => `${item.label.split(' ')[0]}×${Number(rubricWeights[item.key] ?? 0).toFixed(1)}`).join(' + ')}) / (${RUBRIC_DIMENSIONS.map(item => Number(rubricWeights[item.key] ?? 0).toFixed(1)).join(' + ')})`;

  return (
    <div className="flex h-screen bg-[#0f172a] font-sans overflow-hidden">
      
      {/* 侧边导航 - 项目选择器 */}
      <aside className="w-72 bg-[#1e293b] flex flex-col border-r border-white/5 shadow-2xl z-20">
        <div className="p-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-2">
            <RobotOutlined className="text-emerald-400" />
            VentureAdmin
          </h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Instructor Hub</p>
        </div>
        
        <div className="px-4 mb-4">
          <div 
            onClick={() => setActiveMenu('overview')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${activeMenu === 'overview' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <DashboardOutlined /> 全量项目大盘
          </div>
        </div>

        <div className="px-6 py-2">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">辅导项目列表</p>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto custom-scrollbar space-y-1">
          {projects.length > 0 ? projects.map(p => (
            <div 
              key={p.id}
              onClick={() => selectProject(p.id)}
              className={`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all border border-transparent ${activeMenu === p.id.toString() ? 'bg-slate-800 border-emerald-500/50 text-white' : 'hover:bg-slate-800/50 text-slate-400'}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <ProjectOutlined className={activeMenu === p.id.toString() ? 'text-emerald-400' : 'text-slate-600'} />
                <span className="text-sm truncate">{p.name}</span>
              </div>
              {p.risk_level === 'High' && <Badge dot status="error" />}
            </div>
          )) : <div className="p-4 text-center text-slate-600 text-xs text-italic">暂无待辅导项目</div>}
        </nav>

        <div className="p-4 border-t border-white/5 m-4 text-center mt-auto">
          <div className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-slate-800 p-2 rounded-lg" onClick={() => setShowProfileModal(true)}>
            <Avatar size="large" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${teacherName}`} border="2px solid #10b981" />
            <div className="overflow-hidden text-left">
              <p className="text-sm font-bold truncate text-white">{teacherName}</p>
              <p className="text-[10px] text-slate-500">指导教师</p>
            </div>
          </div>
          <div 
            onClick={handleLogout}
            className="w-full py-3 rounded-2xl text-slate-500 hover:text-rose-400 hover:bg-white/5 cursor-pointer transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
          >
            <LogoutOutlined /> 安全退出系统
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto pb-20 bg-[#f1f5f9] relative">
        
        {/* Header Bar */}
        <header className="sticky top-0 h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {activeMenu === 'overview' ? "辅导项目全景大盘" : (
              <>
                <BookOutlined className="text-emerald-500" />
                辅导中: <span className="text-emerald-600">{projectDetail?.project?.name}</span>
              </>
            )}
          </h2>
          <div className="flex gap-4 items-center">
             <Button 
               type="text" 
               icon={<SyncOutlined spin={loading} />} 
               onClick={fetchDashboardData}
               title="同步最新数据"
             />
             {activeMenu !== 'overview' && (
               <Button loading={auditLoading} type="primary" onClick={triggerAudit} icon={<RobotOutlined />} className="bg-indigo-600 border-none">
                  AI 重新审计
               </Button>
             )}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeMenu === 'overview' ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              {/* 数据统计网格 */}
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: "辅导学生数", value: stats.student_count, unit: "人", color: "text-slate-900" },
                  { label: "在孵项目", value: stats.project_count, unit: "个", color: "text-slate-900" },
                  { label: "核心风险项", value: stats.high_risk_count, unit: "项", color: "text-rose-600" },
                  { label: "平均评估率", value: "92%", unit: "", color: "text-emerald-600" }
                ].map((stat, i) => (
                  <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all rounded-2xl">
                    <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-widest font-bold">{stat.label}</p>
                    <p className={`text-3xl font-black ${stat.color}`}>
                      {stat.value}<span className="text-xs ml-1 font-normal opacity-40">{stat.unit}</span>
                    </p>
                  </Card>
                ))}
              </div>

              {/* 核心洞察卡片 */}
              <Card 
                title={<span><WarningOutlined className="mr-2 text-rose-500" /> Top 商业逻辑盲区 (H原则冲突)</span>}
                extra={
                  <Button
                    type="primary"
                    icon={<ExperimentOutlined />}
                    loading={planLoading}
                    disabled={topMistakes.length === 0 || (topMistakes[0]?.count || 0) === 0}
                    onClick={handleGenerateTeachingPlan}
                    className="bg-emerald-600 border-none rounded-full font-black"
                  >
                    生成下周干预方案
                  </Button>
                }
                className="border-none shadow-md rounded-3xl bg-white"
              >
                <div className="space-y-8">
                  <div className="grid grid-cols-3 gap-6">
                    {topMistakes.length > 0 ? topMistakes.map((m, i) => (
                      <div key={i} className="p-6 bg-rose-50/50 rounded-[24px] border border-rose-100/50 transition-all hover:bg-rose-100/50">
                        <div className="flex justify-between items-start mb-3">
                          <span className="px-3 py-1 bg-rose-200 text-rose-700 text-[10px] font-black rounded-full uppercase">{m.name.split(' ')[0]}</span>
                          <span className="text-rose-300 font-black text-2xl">0{i+1}</span>
                        </div>
                        <p className="text-sm font-black text-slate-800">{m.name}</p>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed h-12 overflow-hidden">{m.desc}</p>
                        <div className="mt-4 pt-4 border-t border-rose-200/30 flex items-center justify-between text-[10px] font-black text-rose-600 uppercase tracking-widest">
                          <span>波及范围</span>
                          <span>{m.count} PROJECTS</span>
                        </div>
                      </div>
                    )) : <Empty description="暂无共性风险点" />}
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-slate-800 font-black m-0">下周教学干预建议</h4>
                        <p className="text-[11px] text-slate-400 mt-1 mb-0">基于当前 Top H 原则冲突，由 LLM 自动生成约 300 字的实操教学计划</p>
                      </div>
                      <Tag color="cyan" className="rounded-full border-none px-3 font-bold">≈ 300 字</Tag>
                    </div>
                    <TextArea
                      value={teachingPlan}
                      onChange={(e) => setTeachingPlan(e.target.value)}
                      readOnly={planLoading}
                      autoSize={{ minRows: 5, maxRows: 9 }}
                      placeholder="点击右上角“生成下周干预方案”后，这里会展示针对高频商业逻辑盲区的课堂讲解重点、实操任务和验收建议。"
                      className="rounded-[20px] bg-slate-50 border-slate-100 text-slate-700"
                    />
                  </div>
                </div>
              </Card>

              {/* 项目清单 */}
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-2">
                <div className="px-6 py-4 border-slate-50 flex justify-between items-center">
                  <h3 className="text-slate-800 font-black m-0 uppercase tracking-tighter">Monitoring Inventory</h3>
                  <Tag color="blue" className="rounded-full border-none px-3 font-bold">{projects.length} ACTIVE</Tag>
                </div>
                <Table 
                  dataSource={projects} 
                  columns={columns} 
                  pagination={false} 
                  rowKey="id"
                  loading={loading}
                />
              </div>

            </div>
          ) : (
            /* 项目详情辅导视角 */
            <div className="animate-in slide-in-from-bottom-6 duration-500 space-y-8">
              <div className="grid grid-cols-12 gap-8">
                
                {/* 核心整合：全景评估中心 */}
                <div className="col-span-12">
                  <Card className="border-none shadow-xl rounded-[40px] overflow-hidden bg-white p-2">
                    <div className="grid grid-cols-12 gap-8 p-6">
                      {/* 第一行左侧：多维雷达与风险定级 */}
                      <div className="col-span-6 p-10 flex flex-col items-center justify-center bg-slate-50/60 rounded-[32px] border border-slate-100">
                        <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-10">Matrix Analysis</h4>
                        <div className="relative">
                           <RadarChart data={projectDetail?.assessment} />
                           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <div className="mt-32">
                                <Tag color={getRiskTagColor(computedRiskLevel)} className="px-6 py-2 text-sm font-black rounded-full border-none shadow-xl scale-110">
                                  {computedRiskLevel} RISK
                                </Tag>
                              </div>
                           </div>
                        </div>
                        <p className="mt-12 text-[10px] text-slate-400 font-black uppercase tracking-widest text-center">R1-R9 Structural Model</p>
                      </div>

                      {/* 第一行右侧：全部维度评分 */}
                      <div className="col-span-6 p-10 flex flex-col justify-center bg-white rounded-[32px] border border-slate-100">
                        <h4 className="text-slate-800 text-sm font-black mb-8 flex items-center gap-2">
                          <LineChartOutlined className="text-emerald-500" /> 维度透视
                        </h4>
                        <div className="grid grid-cols-3 gap-x-6 gap-y-6">
                          {RUBRIC_DIMENSIONS.map((r, i) => {
                            const val = toRubricScore(projectDetail?.assessment, r.key);
                            return (
                              <div key={i} className="flex flex-col min-w-0">
                                <div className="flex justify-between text-[11px] mb-2 font-black text-slate-500 uppercase tracking-tighter">
                                  <span className="pr-3 leading-4">{r.label}</span>
                                  <span className="text-slate-900">{val.toFixed(1)}</span>
                                </div>
                                <Progress percent={val * 20} strokeColor={val >= 4 ? '#10b981' : val >= 2.5 ? '#f59e0b' : '#ef4444'} showInfo={false} strokeWidth={8} className="rounded-full" />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 第二行：风险加权计算器 */}
                      <div className="col-span-12 rounded-[32px] border border-slate-100 bg-slate-50/70 p-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <h5 className="m-0 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                              风险加权计算器
                            </h5>
                            <p className="mt-3 mb-0 text-sm text-slate-500 leading-7">
                              基于 R1-R9 当前得分与教师自定义权重，自动计算项目综合风险等级。
                            </p>
                          </div>
                          <Tag color={getRiskTagColor(computedRiskLevel)} className="rounded-full border-none px-4 py-1 font-black self-start">
                            加权均分 {weightedScore.toFixed(2)} / 5.0
                          </Tag>
                        </div>

                        <div className="mt-6 rounded-[28px] bg-white border border-slate-100 px-6 py-5 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
                            加权公式
                          </p>
                          <p className="m-0 text-sm font-bold text-slate-700 leading-7 break-words">
                            {weightedFormulaText}
                          </p>
                          <p className="mt-3 mb-0 text-[11px] text-slate-500 leading-6">
                            风险判定：加权分 ≤ 2.5 为高风险；2.5 &lt; 加权分 ≤ 4 为中风险；4 &lt; 加权分 ≤ 5 为低风险。
                          </p>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {RUBRIC_DIMENSIONS.map((item) => (
                            <div key={item.key} className="rounded-2xl bg-white border border-slate-100 px-4 py-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3 gap-4">
                                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                                  {item.label}
                                </span>
                                <span className="text-sm font-black text-slate-800 shrink-0">
                                  {Number(rubricWeights[item.key] ?? 0).toFixed(1)}
                                </span>
                              </div>
                              <Slider
                                min={0}
                                max={1}
                                step={0.1}
                                value={rubricWeights[item.key]}
                                onChange={(value) => {
                                  setRubricWeights((prev) => ({
                                    ...prev,
                                    [item.key]: Number(value)
                                  }));
                                }}
                                tooltip={{ formatter: (value) => Number(value ?? 0).toFixed(1) }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 第三行左侧：导师专线审计报告 */}
                      <div className="col-span-6 p-10 bg-slate-900 text-white rounded-[32px] relative overflow-hidden flex flex-col min-h-[420px]">
                        <RobotOutlined className="absolute -right-10 -bottom-10 text-white/5 text-[240px] transform rotate-12" />
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-8">
                            <h4 className="text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                              <AuditOutlined /> Instructor-Only Expert Audit
                            </h4>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                              <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-400">DeepSeek Core</span>
                            </div>
                          </div>
                          
                          <div className="flex-1 bg-white/5 rounded-3xl p-8 border border-white/10 backdrop-blur-sm relative mb-6">
                             <div className="text-lg leading-relaxed font-semibold text-slate-100 italic">
                               "{projectDetail?.assessment?.audit_summary || '暂无深度审计报告。作为指导老师，您可以点击下方按钮启动 Agent 对项目底层逻辑的穿透式审计。评分与报告将基于 H 原则与 R 体系自动生成。'}"
                             </div>
                             <div className="absolute top-4 right-6 text-4xl text-white/10 opacity-50 font-serif z-0">"</div>
                          </div>

                          <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest m-0">Generated by Venture Agent V4.9</p>
                            <Button type="primary" size="large" onClick={triggerAudit} loading={auditLoading} className="bg-emerald-600 hover:bg-emerald-500 border-none font-black text-xs h-12 px-8 rounded-2xl shadow-xl shadow-emerald-500/20">
                              EXECUTE RE-AUDIT
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 第三行右侧：证据溯源 */}
                      <div className="col-span-6 p-10 bg-slate-50/80 rounded-[32px] border border-slate-100 flex flex-col min-h-[420px]">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="text-slate-800 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <FileSearchOutlined className="text-emerald-500" /> 漏洞原文溯源 (Evidence Trace)
                          </h4>
                          <Tag color="geekblue" className="rounded-full border-none px-3 font-bold">Source Anchors</Tag>
                        </div>
                        <div className="flex-1 max-h-[560px] text-sm text-slate-600 bg-white p-6 rounded-[28px] leading-8 border border-slate-100 shadow-inner overflow-y-auto custom-scrollbar">
                          {evidenceTraceLines.length > 0 ? evidenceTraceLines.map((line, idx) => (
                            <div key={idx} className="mb-5 last:mb-0">
                              <p className="m-0 whitespace-pre-wrap">
                                {line}
                              </p>
                            </div>
                          )) : (
                            <Empty className="py-16" description="暂无原文证据溯源" />
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* 辅导互动区 */}
                <div className="col-span-12 grid grid-cols-12 gap-8 mt-8">
                  <div className="col-span-7">
                    <Card title={<span className="text-slate-800 font-black uppercase tracking-tight"><ThunderboltOutlined className="mr-2 text-indigo-500" /> Historical Teaching Interventions</span>} className="border-none shadow-xl rounded-[40px] h-full p-2">
                       <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                          {projectDetail?.battle_logs?.length > 0 ? projectDetail.battle_logs.map((log, idx) => (
                            <div key={idx} className={`p-6 rounded-[24px] text-sm relative overflow-hidden ${log.is_active ? 'bg-emerald-50/30 border border-emerald-100/50' : 'bg-slate-50 border border-slate-100'}`}>
                               <div className="relative z-10">
                                 <div className="flex items-center justify-between gap-4 mb-3">
                                   <p className="text-[9px] font-black uppercase opacity-40 tracking-[0.2em]">Teacher Intervention</p>
                                   <span className="text-[10px] font-black text-slate-400">{log.created_at}</span>
                                 </div>
                                 <div className="text-[11px] font-black text-emerald-700 mb-3">{log.teacher_name || teacherName}</div>
                                 <div className="text-slate-800 leading-relaxed font-bold text-base whitespace-pre-wrap">{log.content}</div>
                               </div>
                            </div>
                          )) : <Empty className="py-20" description="暂无对话博弈记录" />}
                       </div>
                    </Card>
                  </div>
                  
                  <div className="col-span-5">
                    <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-2xl h-full flex flex-col relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-1000"></div>
                      <div className="flex items-center gap-4 mb-8">
                         <div className="w-14 h-14 bg-indigo-50 rounded-3xl flex items-center justify-center">
                            <EditOutlined className="text-indigo-600 text-2xl" />
                         </div>
                         <div>
                            <h3 className="text-slate-900 font-black m-0 text-2xl uppercase tracking-tighter">Teaching Intervention</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">下发指令同步至学生端 Agent</p>
                         </div>
                      </div>
                      <TextArea 
                        rows={8} 
                        value={interventionText}
                        onChange={e => setInterventionText(e.target.value)}
                        placeholder="请输入您的指导建议。例如：强制要求项目组在本周内完成目标用户的访谈，并提交 H 原则下的价值主张偏差报告..."
                        className="bg-slate-50/50 border-none text-slate-900 rounded-[32px] focus:ring-emerald-500 text-lg p-8 flex-1 placeholder:text-slate-300 shadow-inner"
                      />
                      <div className="mt-10">
                        <Button type="primary" size="large" block icon={<SendOutlined />} onClick={handleSendInterventionAction} className="bg-slate-900 hover:bg-emerald-600 border-none rounded-[24px] h-20 font-black text-lg shadow-2xl shadow-indigo-500/20 transition-all active:scale-95">
                          ACTIVATE INSTRUCTION
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 mt-8">
                  <Card 
                    title={<span className="text-slate-800 font-black uppercase tracking-tight"><UserOutlined className="mr-2 text-indigo-500" /> Team Dynamics & Execution Profile</span>} 
                    extra={teamProfile && teamProfile.scores ? <Button type="dashed" onClick={fetchTeamProfile} icon={<SyncOutlined />} className="rounded-full font-bold text-xs">重新评估 (Refresh)</Button> : null}
                    className="border-none shadow-xl rounded-[40px] bg-white p-2"
                  >
                    {teamProfileLoading ? (
                      <div className="flex justify-center items-center h-64 text-slate-400"><Spin /> <span className="ml-3">正在拉取团队历史交锋记录生成动态画像...</span></div>
                    ) : teamProfile && teamProfile.scores ? (
                      <div className="grid grid-cols-12 gap-8 p-6">
                         <div className="col-span-6 flex flex-col items-center justify-center p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 relative">
                           <p className="text-xs text-slate-400 font-medium mb-4">💡 点击雷达图顶角查看大模型抽取证据</p>
                           <InteractiveTeamRadarChart 
                              profile={teamProfile} 
                              selectedDimension={selectedDimension}
                              onSelectDimension={(dim) => { 
                                setSelectedDimension(dim);
                                setSelectedTeamEvidence(teamProfile.evidences[dim]); 
                              }} 
                           />
                         </div>
                         <div className="col-span-6 p-10 bg-indigo-50/30 rounded-[32px] border border-indigo-50 relative flex flex-col h-full justify-center min-h-[300px]">
                           {selectedDimension ? (
                             <div className="animate-in fade-in zoom-in-95 duration-300 relative z-10 w-full h-full flex flex-col justify-center">
                               <div className="bg-white text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest self-start mb-6 border border-indigo-100 shadow-sm">
                                 {TEAM_PROFILE_LABELS[selectedDimension]} · Evidence Trace
                               </div>
                               
                               {typeof selectedTeamEvidence === 'string' ? (
                                 <h3 className="text-xl font-bold text-slate-700 mb-6 leading-[1.8]">
                                   {selectedTeamEvidence}
                                 </h3>
                               ) : (
                                 <>
                                   <h3 className="text-lg font-bold text-slate-700 mb-4 leading-[1.8]">
                                     {selectedTeamEvidence?.summary}
                                   </h3>
                                   {selectedTeamEvidence?.exact_quote && (
                                     <div className="bg-white/60 border-l-4 border-indigo-400 p-5 rounded-r-[24px] italic text-slate-600 text-[14px] mb-8 shadow-sm">
                                       <div className="font-black text-[10px] uppercase text-indigo-400 mb-2 tracking-widest flex items-center gap-2">
                                         <CheckCircleOutlined /> 原文对话摘录 (Raw Chat Excerpt)
                                       </div>
                                       "{selectedTeamEvidence.exact_quote}"
                                     </div>
                                   )}
                                 </>
                               )}
                               
                               <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-auto flex items-center gap-2">
                                 <CheckCircleOutlined className="text-indigo-400 text-sm" /> LLM Cross-Verified from Conversation Logs
                               </div>
                             </div>
                           ) : (
                             <div className="text-center w-full h-full flex flex-col justify-center">
                               <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tighter">团队执行力总评</h3>
                               <p className="text-slate-600 leading-[1.8] text-[15px] font-medium bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-left">
                                 {teamProfile.overall_comment}
                               </p>
                               <div className="mt-8 pt-6 border-t border-indigo-100/50 flex justify-center">
                                 <Tag color="indigo" className="px-5 py-2.5 rounded-full border-none font-black text-[10px] uppercase tracking-widest shadow-sm">
                                   Please interact with radar chart
                                 </Tag>
                               </div>
                             </div>
                           )}
                         </div>
                      </div>
                    ) : (
                      <div className="py-20 flex flex-col items-center justify-center text-center">
                        <Button 
                          type="primary" 
                          size="large" 
                          onClick={fetchTeamProfile}
                          className="bg-indigo-600 hover:bg-slate-800 border-none font-black px-12 h-16 rounded-full shadow-lg shadow-indigo-500/20 mb-8 text-base tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                          <SyncOutlined /> 启动执行力诊断 (GENERATE PROFILE)
                        </Button>
                        <div className="max-w-2xl mx-auto bg-slate-50/80 p-8 rounded-[32px] border border-slate-100">
                           <p className="text-slate-700 font-bold mb-4 flex items-center justify-center gap-2 text-[15px]">
                             <span className="text-2xl">💡</span> 基于当前项目最近 3 轮问答生成，继续对话后可重新点击生成刷新。
                           </p>
                           <p className="text-slate-600 text-[14px] leading-8 m-0 font-bold">
                             功能原理：系统将提取本组所有成员与 AI 模拟投资人的“抗压对话记录”，通过核心大模型引擎评估团队的抗风险韧性、成员多元化补充与实质调研行动力，协助导师跳出由于文字 BP 掩饰带来的评估盲区。
                           </p>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

              </div>
            </div>
          )}
        </div>
      </main>

      <UserProfileModal 
        visible={showProfileModal} 
        onCancel={() => setShowProfileModal(false)} 
        username={localStorage.getItem('va_username') || 'teacher'} 
      />

      <style dangerouslySetInnerHTML={{__html: `
        .ant-card-head { border-bottom: 1px solid #f1f5f9 !important; min-height: 56px; }
        .ant-card-head-title { font-weight: 800; color: #1e293b; font-size: 15px; }
        .ant-progress-inner { background-color: #f1f5f9 !important; }
      `}} />

    </div>
  );
}
