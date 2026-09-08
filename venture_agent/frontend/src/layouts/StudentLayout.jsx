import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import ReactMarkdown from 'react-markdown';
import { Button, Input } from 'antd';
import { PlusOutlined, SendOutlined } from '@ant-design/icons';

const { TextArea } = Input;

// ========================
// MOCK DATA
// ========================
const mockHistory = [
  { id: '1', title: '商业计划书痛点分析' },
  { id: '2', title: '团队架构优化建议' },
  { id: '3', title: '路演PPT逻辑梳理' },
];

const mockMessages = [
  { id: 1, role: 'user', content: '我正在做一个针对大学生的二手交易平台，你觉得最大的痛点是什么？' },
  { id: 2, role: 'ai', content: '很好的创业方向！针对大学生的二手交易平台，核心痛点通常包括以下几点：\n\n1. **信任度与安全性**：如何保证交易物品的真实性和交接安全？\n2. **物流与交付**：校内交易通常涉及面交，如何提高匹配与交接效率？\n3. **获客与留存**：学生群体容易被新事物吸引，如何维持高频次访问？\n\n我们可以先从**信任度**这个痛点深入挖掘。' },
];

const mockTasks = [
  { id: 1, title: '补充竞品分析 (闲鱼/转转对比)', status: 'pending' },
  { id: 2, title: '完善商业模式盈利测算', status: 'pending' },
];

// ECharts 配置
const radarOption = {
  title: {
    text: '创业能力实时图谱',
    textStyle: { fontSize: 16, color: '#333', fontWeight: 600 },
    left: 'center',
    top: 10
  },
  tooltip: { trigger: 'item' },
  radar: {
    indicator: [
      { name: '痛点挖掘', max: 100 },
      { name: '方案设计', max: 100 },
      { name: '商业模式', max: 100 },
      { name: '团队搭建', max: 100 },
      { name: '路演表达', max: 100 }
    ],
    radius: '55%',
    center: ['50%', '55%'],
    splitNumber: 4,
    axisName: { color: '#666', fontSize: 12 }
  },
  series: [{
    name: '能力评估',
    type: 'radar',
    itemStyle: { color: '#1677ff' },
    areaStyle: { color: 'rgba(22, 119, 255, 0.2)' },
    data: [{ value: [85, 65, 40, 75, 50], name: '当前状态' }]
  }]
};

// ========================
// STYLES (Inline to ensure success)
// ========================
const styles = {
  rootContainer: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  // 左侧边栏
  leftSidebar: {
    width: '260px',
    minWidth: '260px',
    backgroundColor: '#f9f9f9',
    borderRight: '1px solid #e5e5e5',
    display: 'flex',
    flexDirection: 'column',
  },
  newChatContainer: {
    padding: '20px',
    borderBottom: '1px solid #e5e5e5'
  },
  historyList: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px'
  },
  historyItem: {
    padding: '12px 16px',
    margin: '4px 0',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#333',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  historyItemActive: {
    backgroundColor: '#e6f4ff',
    color: '#1677ff',
    fontWeight: '500'
  },
  
  // 中间核心区
  centerArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: '400px', // 防止被挤压到消失
    backgroundColor: '#ffffff'
  },
  header: {
    height: '60px',
    minHeight: '60px',
    borderBottom: '1px solid #e5e5e5',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  messageArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center' // 居中气泡容器
  },
  messageWrapper: {
    width: '100%',
    maxWidth: '800px', // 限制最大宽度，阅读体验更好
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  inputArea: {
    padding: '20px 24px',
    borderTop: '1px solid transparent', // 预留位置，或者去掉边框用阴影
    display: 'flex',
    justifyContent: 'center'
  },
  inputContainer: {
    width: '100%',
    maxWidth: '800px',
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 0 15px rgba(0,0,0,0.1)',
    border: '1px solid #e5e5e5',
    padding: '12px',
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px'
  },
  
  // 右侧边栏
  rightSidebar: {
    width: '320px',
    minWidth: '320px',
    backgroundColor: '#fbfbfb',
    borderLeft: '1px solid #e5e5e5',
    display: 'flex',
    flexDirection: 'column',
  },
  rightPanelContent: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid #f0f0f0'
  },
  taskTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    borderBottom: '1px solid #f0f0f0',
    paddingBottom: '8px'
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    fontSize: '14px',
    color: '#444'
  },
  taskDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#faad14'
  }
};

// ========================
// COMPONENT
// ========================
export default function StudentLayout() {
  const [inputValue, setInputValue] = useState('');

  return (
    <div style={styles.rootContainer}>
      
      {/* ================= 左侧：历史记录 ================= */}
      <div style={styles.leftSidebar}>
        <div style={styles.newChatContainer}>
          <Button type="primary" icon={<PlusOutlined />} block size="large" style={{ borderRadius: '8px' }}>
            新建大模型对话
          </Button>
        </div>
        <div style={styles.historyList}>
          {mockHistory.map((item, index) => (
            <div 
              key={item.id} 
              style={{
                ...styles.historyItem,
                ...(index === 0 ? styles.historyItemActive : {})
              }}
            >
              <span style={{ marginRight: '8px' }}>💬</span>
              {item.title}
            </div>
          ))}
        </div>
      </div>

      {/* ================= 中间：核心聊天区 ================= */}
      <div style={styles.centerArea}>
        <div style={styles.header}>
          当前对话：商业计划书痛点分析
        </div>
        
        <div style={styles.messageArea}>
          <div style={styles.messageWrapper}>
            {mockMessages.map((msg) => (
              <div 
                key={msg.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                <div style={{
                  backgroundColor: msg.role === 'user' ? '#1677ff' : '#f4f6f8',
                  color: msg.role === 'user' ? '#fff' : '#333',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderTopLeftRadius: msg.role === 'ai' ? '4px' : '16px',
                  maxWidth: '85%',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}>
                  {msg.role === 'user' ? (
                    <div>{msg.content}</div>
                  ) : (
                    <div className="markdown-body" style={{ margin: 0 }}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.inputArea}>
          <div style={styles.inputContainer}>
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="发送消息..."
              autoSize={{ minRows: 1, maxRows: 6 }}
              bordered={false}
              style={{ flex: 1, resize: 'none', fontSize: '15px', padding: '4px 0' }}
            />
            <Button 
              type="primary" 
              shape="circle" 
              icon={<SendOutlined />} 
              size="large"
              disabled={!inputValue.trim()}
              style={{ flexShrink: 0 }}
            />
          </div>
        </div>
      </div>

      {/* ================= 右侧：能力与任务 ================= */}
      <div style={styles.rightSidebar}>
        <div style={styles.rightPanelContent}>
          
          {/* 雷达图卡片 */}
          <div style={styles.card}>
            <ReactECharts option={radarOption} style={{ height: '280px', width: '100%' }} />
          </div>

          {/* 任务指南卡片 */}
          <div style={styles.card}>
            <div style={styles.taskTitle}>🎯 下一步任务指南</div>
            <div>
              {mockTasks.map(task => (
                <div key={task.id} style={styles.taskItem}>
                  <div style={styles.taskDot} />
                  <span>{task.title}</span>
                </div>
              ))}
            </div>
            <Button type="dashed" block style={{ marginTop: '16px', color: '#1677ff', borderColor: '#91caff' }}>
              查看所有任务
            </Button>
          </div>
          
        </div>
      </div>

    </div>
  );
}
