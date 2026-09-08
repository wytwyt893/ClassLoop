import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Space, Divider } from 'antd';
import { UserOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function Login() {
  const navigate = useNavigate();

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0f2f5',
      backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
      backgroundSize: '20px 20px'
    }}>
      <Card 
        bordered={false}
        style={{ 
          width: 480, 
          borderRadius: '16px', 
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          textAlign: 'center',
          padding: '24px 0'
        }}
      >
        <Title level={2} style={{ margin: 0, color: '#0f172a' }}>创新创业智能体</Title>
        <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: '40px' }}>
          Venture Agent Platform
        </Text>

        <Divider style={{ color: '#94a3b8', fontSize: '14px' }}>请选择您的登录身份</Divider>

        <Space direction="vertical" size="large" style={{ width: '100%', padding: '0 32px' }}>
          <Button 
            type="primary" 
            size="large" 
            block 
            icon={<UserOutlined />}
            onClick={() => navigate('/student')}
            style={{ 
              height: '56px', 
              fontSize: '16px', 
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
            }}
          >
            以 学生 (创业者) 身份登录
          </Button>

          <Button 
            size="large" 
            block 
            icon={<SafetyCertificateOutlined />}
            onClick={() => navigate('/teacher')}
            style={{ 
              height: '56px', 
              fontSize: '16px', 
              borderRadius: '8px',
              color: '#0f172a',
              borderColor: '#cbd5e1'
            }}
          >
            以 教师 (后台管理员) 身份登录
          </Button>
        </Space>

      </Card>
    </div>
  );
}
