import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Avatar, Tag, message, Divider, Spin } from 'antd';
import { UserOutlined, IdcardOutlined, BankOutlined, SafetyOutlined } from '@ant-design/icons';
import { buildApiUrl } from '../config/api';

const UserProfileModal = ({ visible, onCancel, username }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (visible && username) {
      fetchProfile();
    }
  }, [visible, username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl(`/api/user/profile?username=${username}`));
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        form.setFieldsValue({
          real_name: data.real_name,
          college: data.college,
          major: data.major,
          grade: data.grade
        });
      }
    } catch (e) {
      console.error(e);
      message.error("获取资料失败");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (values) => {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl(`/api/user/profile/update?username=${username}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      if (res.ok) {
        message.success("个人资料更新成功");
        if (values.real_name !== undefined) localStorage.setItem('va_realname', values.real_name || '');
        if (values.college !== undefined) localStorage.setItem('va_college', values.college || '');
        if (values.major !== undefined) localStorage.setItem('va_major', values.major || '');
        if (values.grade !== undefined) localStorage.setItem('va_grade', values.grade || '');
        fetchProfile();
      } else {
        message.error("更新失败");
      }
    } catch (e) {
      message.error("后端服务连接失败");
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!profile) {
      return (
        <div className="py-20 text-center">
          <Spin size="large" />
          <p className="text-slate-300 font-black text-[10px] uppercase tracking-widest mt-4">Initializing Matrix Data...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <Avatar 
              size={100} 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.real_name || 'User'}`} 
              className="border-4 border-white shadow-2xl"
            />
            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md">
              <Tag color={profile.role === 'admin' ? 'purple' : profile.role === 'teacher' ? 'blue' : 'green'} className="m-0 border-none font-black text-[9px] uppercase">
                {profile.role || 'user'}
              </Tag>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-800 m-0">{profile.real_name}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Matrix Identity: #{profile.username}</p>
          </div>
        </div>

        <Divider className="my-2" />

        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item label={<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">真实姓名</span>} name="real_name">
            <Input prefix={<UserOutlined className="text-slate-300" />} className="h-11 rounded-xl" />
          </Form.Item>
          <Form.Item label={<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">所属学院/部门</span>} name="college">
            <Input prefix={<BankOutlined className="text-slate-300" />} className="h-11 rounded-xl" />
          </Form.Item>
          {profile?.role === 'student' ? (
            <>
              <Form.Item label={<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">所属专业</span>} name="major">
                <Input className="h-11 rounded-xl" />
              </Form.Item>
              <Form.Item label={<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">当前年级</span>} name="grade">
                <Input className="h-11 rounded-xl" />
              </Form.Item>
            </>
          ) : null}
          <Button type="primary" htmlType="submit" loading={loading} block className="h-12 rounded-2xl bg-indigo-600 border-none shadow-lg shadow-indigo-100 font-black mt-4">
            更新项目档案
          </Button>
        </Form>

        <div className="pt-6 border-t border-slate-50 flex justify-between items-center text-[10px] font-bold text-slate-300">
          <div className="flex items-center gap-2 font-black uppercase tracking-widest"><SafetyOutlined /> SECURED BY VENTURE</div>
          <div className="cursor-pointer hover:text-red-400 transition-colors uppercase tracking-widest font-black" onClick={() => { localStorage.clear(); window.location.href='/'; }}>Exit System</div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      centered
      width={420}
      className="premium-modal no-border-modal"
      title={<div className="flex items-center gap-2 pt-4 px-4"><IdcardOutlined className="text-indigo-500" /><span className="text-sm font-black text-slate-800 uppercase tracking-widest">Account Matrix</span></div>}
    >
      {renderContent()}
    </Modal>
  );
};

export default UserProfileModal;
