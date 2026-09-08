import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, Row, Col, Statistic, Table, Tag, Button, Empty, message, Descriptions, Divider, Avatar } from 'antd';
import { 
  DashboardOutlined, 
  ProjectOutlined, 
  TeamOutlined, 
  DatabaseOutlined, 
  NodeIndexOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  GlobalOutlined,
  RocketOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import UserProfileModal from '../components/UserProfileModal';
import { buildApiUrl } from '../config/api';

const { Header, Content, Sider } = Layout;

const AdminMatrix = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ project_count: 0, user_count: 0, file_count: 0, college_distribution: {} });
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [sqliteTables, setSqliteTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState({ columns: [], data: [] });
  const [sqliteLoading, setSqliteLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const username = localStorage.getItem('username') || '001';

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    }
    if (activeTab === 'projects') {
      fetchProjects();
    }
    if (activeTab === 'users') {
      fetchUsers();
    }
    if (activeTab === 'sqlite') {
      fetchSqliteTables();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/dashboard'));
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/admin/projects'));
      if (res.ok) setProjects(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/identities')); // 尝试新接口
      if (!res.ok) {
        // 退而求其次使用原接口 (具备数组容错逻辑)
        const res2 = await fetch(buildApiUrl('/api/admin/users'));
        if (res2.ok) {
           const data = await res2.json();
           const normalized = data.map(item => {
             // 重点修复逻辑：如果后端返回的是 [val, val, ...] 列表，则手动映射
             if (Array.isArray(item)) {
               return { username: item[0], real_name: item[1] || '---', role: item[2] || 'student', college: item[3] || '未录入' };
             }
             return item;
           });
           setUsers(normalized);
        }
      } else {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error("Fetch users failed:", e);
    }
  };

  const fetchSqliteTables = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/sqlite/tables'));
      if (res.ok) {
        const tables = await res.json();
        setSqliteTables(tables);
        if (tables.length > 0 && !selectedTable) {
          handleTableSelect(tables[0]);
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleTableSelect = async (tableName) => {
    setSelectedTable(tableName);
    setSqliteLoading(true);
    try {
      const res = await fetch(buildApiUrl(`/api/admin/sqlite/data/${tableName}`));
      if (res.ok) {
        setTableData(await res.json());
      }
    } catch (e) { console.error(e); }
    setSqliteLoading(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const projectColumns = [
    { title: '项目名称', dataIndex: 'name', key: 'name', render: (text) => <span className="font-black text-slate-800">{text}</span> },
    { title: '负责人 ID', dataIndex: 'owner_id', key: 'owner_id' },
    { title: '所属学院', dataIndex: 'college', key: 'college', render: (text) => <Tag color="purple">{text || '通用'}</Tag> },
    { title: '赛事类型', dataIndex: 'competition', key: 'competition' },
    { title: '附件数', dataIndex: 'file_count', key: 'file_count', render: (count) => <Tag color={count > 0 ? 'green' : 'orange'}>{count} 个附件</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
  ];

  const userColumns = [
    { title: '账号 (ID)', dataIndex: 'username', key: 'username', render: (text) => <span className="font-mono font-bold text-indigo-600">{text}</span> },
    { title: '姓名', dataIndex: 'real_name', key: 'real_name' },
    { 
      title: '角色标识', 
      dataIndex: 'role', 
      key: 'role',
      render: (role) => {
        const r = String(role).toLowerCase();
        if (r === 'teacher') return <Tag color="blue" className="rounded-full px-4 border-none font-bold">教师</Tag>;
        if (r === 'admin') return <Tag color="purple" className="rounded-full px-4 border-none font-bold">管理员</Tag>;
        return <Tag color="green" className="rounded-full px-4 border-none font-bold">学生</Tag>;
      }
    },
    { title: '所属组织', dataIndex: 'college', key: 'college' },
  ];

  return (
    <Layout className="min-h-screen bg-[#f8f9ff]">
      <Sider width={260} theme="light" className="border-r border-indigo-50" style={{ background: '#fff' }}>
        <div className="flex flex-col justify-between h-full bg-slate-900 overflow-hidden relative">
          <div>
            <div className="p-8 flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-xl text-white shadow-lg shadow-indigo-500/20">
                <SafetyOutlined />
              </div>
              <div>
                <h1 className="text-white text-lg font-black m-0 tracking-tighter">VENTURE</h1>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-[-2px]">ADMIN MATRIX</p>
              </div>
            </div>
            <Menu
              theme="dark"
              mode="inline"
              className="px-4 border-none bg-transparent lofty-menu"
              selectedKeys={[activeTab]}
              onClick={({ key }) => setActiveTab(key)}
              items={[
                { key: 'dashboard', icon: <DashboardOutlined />, label: '全局大盘概览' },
                { key: 'projects', icon: <ProjectOutlined />, label: '全量项目监控' },
                { key: 'users', icon: <NodeIndexOutlined />, label: 'Neo4j 身份图谱' },
                { key: 'sqlite', icon: <DatabaseOutlined />, label: 'SQLite 实验室' },
              ]}
            />
          </div>
          
          <div className="p-4 border-t border-white/5 m-4 text-center">
             <div 
                onClick={handleLogout}
                className="w-full py-3 rounded-2xl text-slate-500 hover:text-red-400 hover:bg-white/5 cursor-pointer transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
             >
                <LogoutOutlined /> 安全退出系统
             </div>
          </div>
        </div>
      </Sider>

      <Layout className="bg-transparent">
        <Header className="bg-white/80 backdrop-blur-md border-b border-indigo-50 px-10 flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-purple-400 uppercase tracking-widest leading-none">VentureAgent</span>
            <span className="text-xs font-black text-slate-300">/</span>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none">
              {activeTab === 'dashboard' ? 'Global Insight' : activeTab === 'projects' ? 'Project Monitoring' : activeTab === 'users' ? 'User Identity Map' : 'System State'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Tag color="purple" className="border-none font-bold px-3 py-1 rounded-full shadow-sm">超级管理员</Tag>
            <div 
              className="w-10 h-10 rounded-full bg-slate-100 border-2 border-indigo-100 shadow-sm flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-400 hover:scale-105 transition-all"
              onClick={() => setProfileVisible(true)}
            >
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} alt="avatar" />
            </div>
          </div>
        </Header>

        <Content className="px-10 pt-10 pb-0 custom-scrollbar overflow-y-auto bg-[#f8f9ff] min-h-[calc(100vh-80px)]">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in duration-500 pb-10">
              <Row gutter={[24, 24]}>
                <Col span={6}>
                  <Card className="rounded-[32px] border-none shadow-xl shadow-indigo-500/5 p-4 text-center">
                    <Statistic title={<span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">全域项目总数</span>} value={stats.project_count} prefix={<ProjectOutlined className="text-purple-500 mr-2" />} valueStyle={{ fontWeight: 900, color: '#1e293b' }} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card className="rounded-[32px] border-none shadow-xl shadow-indigo-500/5 p-4 text-center">
                    <Statistic title={<span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">活跃用户总数</span>} value={stats.user_count} prefix={<TeamOutlined className="text-blue-500 mr-2" />} valueStyle={{ fontWeight: 900, color: '#1e293b' }} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card className="rounded-[32px] border-none shadow-xl shadow-indigo-500/5 p-4 text-center">
                    <Statistic title={<span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">存量附件总数</span>} value={stats.file_count} prefix={<DatabaseOutlined className="text-emerald-500 mr-2" />} valueStyle={{ fontWeight: 900, color: '#1e293b' }} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card className="rounded-[32px] border-none shadow-xl shadow-indigo-500/5 p-4 text-center bg-white border border-indigo-50">
                    <Statistic title={<span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">系统运行健康度</span>} value="99.8" suffix={<span className="text-emerald-500 text-xs font-black">%</span>} valueStyle={{ fontWeight: 900, color: '#6366f1' }} />
                  </Card>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col span={16}>
                  <Card className="rounded-[40px] border border-indigo-50 shadow-2xl shadow-indigo-500/10 p-2 overflow-hidden min-h-[460px] flex flex-col" title={<span className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2"><GlobalOutlined className="text-purple-500" /> 近期活跃项目流 (Real-time Flux)</span>}>
                    <div className="flex-1 overflow-auto">
                      <Table 
                        dataSource={projects} 
                        columns={projectColumns.slice(0, 4)} 
                        pagination={{ pageSize: 8, hideOnSinglePage: true }} 
                        className="admin-mini-table"
                        rowKey="id"
                        size="small"
                      />
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card className="rounded-[40px] border border-indigo-50 shadow-2xl shadow-indigo-500/10 p-10 flex flex-col justify-center text-center gap-6 bg-gradient-to-br from-white to-indigo-50/40 h-full min-h-[460px]">
                    <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center text-5xl text-purple-600 mx-auto shadow-inner border-4 border-white"><SafetyCertificateOutlined /></div>
                    <div className="space-y-4">
                       <h3 className="text-xl font-black text-slate-800">校级双创决策大脑</h3>
                       <p className="text-xs text-slate-400 leading-relaxed font-black uppercase tracking-widest">
                         当前接入学院: <span className="text-indigo-600">{Object.keys(stats.college_distribution).length}</span><br/>
                         核心业务覆盖度: <span className="text-emerald-500">92.5%</span>
                       </p>
                       <Divider dashed />
                       <div className="p-4 bg-white/50 rounded-3xl border border-white">
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">活跃贡献排行</p>
                         <p className="text-lg font-black text-purple-600 m-0">{Object.entries(stats.college_distribution).sort((a,b)=>b[1]-a[1])[0]?.[0] || '系统计算中...'}</p>
                       </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-500 pb-10">
              <Card className="rounded-[40px] border-none shadow-2xl shadow-indigo-500/10 p-8 min-h-[calc(100vh-120px)] flex flex-col">
                <div className="flex justify-between items-center mb-10 px-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 m-0">全量项目数据库监控 (Central Matrix)</h2>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-2">Real-time SQLite Project Tracking Matrix</p>
                  </div>
                  <Button onClick={fetchProjects} icon={<RocketOutlined />} shape="round" className="h-12 px-8 font-black bg-slate-900 border-none text-white shadow-xl shadow-slate-200 hover:scale-105 transition-all">刷新全量快照</Button>
                </div>
                <div className="flex-1 bg-white rounded-[32px] overflow-hidden">
                  <Table 
                    loading={isLoading}
                    dataSource={projects} 
                    columns={projectColumns} 
                    rowKey="id"
                    className="lofty-table h-full"
                    pagination={{ pageSize: 12, hideOnSinglePage: false }}
                    scroll={{ y: 'calc(100vh - 480px)' }}
                  />
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-in fade-in duration-500">
               <Row gutter={24} className="pb-10">
                  <Col span={10}>
                    <Card className="rounded-[40px] border-none shadow-2xl shadow-indigo-500/10 p-6 h-[calc(100vh-120px)] flex flex-col">
                      <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-8 px-4 flex items-center gap-2"><TeamOutlined className="text-indigo-500" /> 用户实名名录</h3>
                      <div className="flex-1 overflow-auto">
                        <Table dataSource={users} columns={userColumns} rowKey="username" className="lofty-table" pagination={{ pageSize: 12, size: 'small' }} size="small" />
                      </div>
                    </Card>
                  </Col>
                  <Col span={14}>
                     <div className="h-[calc(100vh-120px)] rounded-[40px] overflow-hidden border border-indigo-100 shadow-2xl relative flex flex-col bg-slate-900 text-white">
                        <div className="px-8 py-4 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-3">
                               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Neo4j Explorer Matrix</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[9px] text-white/40 font-bold italic mr-4">Default: neo4j/neo4j</span>
                              <Button type="primary" size="small" className="bg-purple-600 border-none text-[9px] font-black" onClick={() => window.open('http://localhost:7474', '_blank')}>独立窗口</Button>
                            </div>
                        </div>
                        <div className="flex-1 bg-white relative">
                             {/* 提示底层 */}
                             <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl text-slate-200 animate-pulse"><NodeIndexOutlined /></div>
                                <div className="space-y-1">
                                   <h3 className="text-sm font-black text-slate-700">正在尝试加载图谱...</h3>
                                   <p className="text-[10px] text-slate-400 max-w-xs mx-auto">若提示连接被拒绝，请点击上方按钮在独立窗口中开启实验室。项项项?</p>
                                </div>
                             </div>
                             <iframe 
                                src="http://localhost:7474" 
                                className="w-full h-full border-none bg-transparent relative z-10" 
                                title="Neo4j Browser"
                             />
                        </div>
                     </div>
                  </Col>
               </Row>
            </div>
          )}

          {activeTab === 'sqlite' && (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
               <Card className="rounded-[40px] border-none shadow-2xl shadow-indigo-500/10 p-8 h-[calc(100vh-120px)] flex flex-col overflow-hidden mb-10">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl text-emerald-600 shadow-inner">
                           <DatabaseOutlined />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-800 m-0">SQLite 实验室</h3>
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">Structured Query & Data Snapshot</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-3xl border border-slate-100 w-full md:w-auto">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">选择数据表:</span>
                        <div className="w-64">
                          <select 
                            value={selectedTable} 
                            onChange={(e) => handleTableSelect(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer ring-offset-1"
                          >
                            {sqliteTables.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                        <Tag color="cyan" className="rounded-full px-4 border-none font-black uppercase tracking-tighter ml-2 bg-white text-cyan-600 shadow-sm">Read Only</Tag>
                     </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto rounded-[32px] border border-slate-100 bg-[#fcfdfe] relative group">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-indigo-500 z-10 opacity-50"></div>
                     <Table 
                        columns={tableData.columns}
                        dataSource={tableData.data}
                        loading={sqliteLoading}
                        pagination={{ pageSize: 20, size: 'small', showSizeChanger: false }}
                        size="small"
                        className="lofty-table-static"
                        rowKey={(record, index) => index}
                        scroll={{ x: 'max-content', y: 'calc(100vh - 420px)' }}
                        bordered={false}
                     />
                  </div>
               </Card>
            </div>
          )}
        </Content>
      </Layout>

      <UserProfileModal 
        visible={profileVisible} 
        onCancel={() => setProfileVisible(false)} 
        username={username}
      />
    </Layout>
  );
};

export default AdminMatrix;
