import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, Form, Input, Select, Popconfirm, Space, message, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { API_BASE } from '../config';
import { normalizeRole } from '../../accessControl';

const UserManagementModal = ({ visible, onCancel, token, currentUser }) => {
    const [users, setUsers] = useState([]);
    const [synagogues, setSynagogues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isAddUserVisible, setIsAddUserVisible] = useState(false);
    const [isAddSynagogueVisible, setIsAddSynagogueVisible] = useState(false);
    const [form] = Form.useForm();
    const [synagogueForm] = Form.useForm();

    const fetchHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/users`, {
                headers: fetchHeaders
            });
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
            message.error('שגיאה בטעינת משתמשים');
        } finally {
            setLoading(false);
        }
    };

    const fetchSynagogues = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/synagogues`, { headers: fetchHeaders });
            if (!response.ok) throw new Error('Failed to fetch synagogues');
            const data = await response.json();
            setSynagogues(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching synagogues:', error);
        }
    };

    useEffect(() => {
        if (visible && token) {
            fetchUsers();
            fetchSynagogues();
        }
    }, [visible, token]);

    const handleCreateUser = async (values) => {
        try {
            // For synagogue admin, enforce their synagogueId
            const payload = {
                ...values,
                synagogueId: values.synagogueId || null
            };
            
            if (currentUser?.role !== 'super_admin' && currentUser?.synagogueId) {
                payload.synagogueId = currentUser.synagogueId;
            }
            
            const response = await fetch(`${API_BASE}/api/users`, {
                method: 'POST',
                headers: fetchHeaders,
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create user');
            
            message.success('משתמש נוצר בהצלחה');
            form.resetFields();
            setIsAddUserVisible(false);
            fetchUsers();
        } catch (error) {
            console.error('Create user error:', error);
            message.error(error.message || 'שגיאה ביצירת משתמש');
        }
    };

    const handleCreateSynagogue = async (values) => {
        try {
            const response = await fetch(`${API_BASE}/api/synagogues`, {
                method: 'POST',
                headers: fetchHeaders,
                body: JSON.stringify(values)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create synagogue');
            message.success('בית כנסת נוצר בהצלחה');
            synagogueForm.resetFields();
            setIsAddSynagogueVisible(false);
            fetchSynagogues();
        } catch (error) {
            console.error('Create synagogue error:', error);
            message.error(error.message || 'שגיאה ביצירת בית כנסת');
        }
    };

    const handleDeleteUser = async (username) => {
        try {
            const response = await fetch(`${API_BASE}/api/users/${username}`, {
                method: 'DELETE',
                headers: fetchHeaders
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete user');
            }
            message.success('משתמש נמחק בהצלחה');
            fetchUsers();
        } catch (error) {
            console.error('Delete user error:', error);
            message.error(error.message || 'שגיאה במחיקת משתמש');
        }
    };

    const handleChangePassword = async (username) => {
        const newPassword = prompt('הזן סיסמה חדשה עבור ' + username + ':');
        if (newPassword === null) return; // user cancelled
        if (!newPassword.trim()) {
            message.error('הסיסמה אינה יכולה להיות ריקה');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/users/${username}`, {
                method: 'PUT',
                headers: fetchHeaders,
                body: JSON.stringify({ password: newPassword })
            });
            if (!response.ok) throw new Error('Failed to update password');
            message.success('הסיסמה עודכנה בהצלחה');
        } catch (error) {
            console.error('Change password error:', error);
            message.error('שגיאה בעדכון הסיסמה');
        }
    };

    const handleChangeRole = async (username, newRole) => {
        try {
            // For synagogue admin, prevent assigning super_admin role
            if (currentUser?.role !== 'super_admin' && newRole === 'super_admin') {
                message.error('אין לך הרשאה להקצות תפקיד מנהל על');
                return;
            }
            
            const response = await fetch(`${API_BASE}/api/users/${username}`, {
                method: 'PUT',
                headers: fetchHeaders,
                body: JSON.stringify({ role: newRole })
            });
            if (!response.ok) throw new Error('Failed to update role');
            message.success('ההרשאה עודכנה בהצלחה');
            fetchUsers();
        } catch (error) {
            console.error('Change role error:', error);
            message.error('שגיאה בעדכון ההרשאה');
        }
    };

    const columns = [
        {
            title: 'שם משתמש',
            dataIndex: 'username',
            key: 'username',
            style: { fontWeight: 'bold' }
        },
        {
            title: 'הרשאה',
            dataIndex: 'role',
            key: 'role',
            render: (role, record) => {
                if (record.username === 'admin') {
                    return <Tag color="gold">מנהל על</Tag>;
                }
                const normalizedRole = normalizeRole(role);
                const isCurrentUserSuperAdmin = currentUser?.role === 'super_admin';
                return (
                    <Select
                        value={normalizedRole}
                        onChange={(val) => handleChangeRole(record.username, val)}
                        style={{ width: 150 }}
                    >
                        {isCurrentUserSuperAdmin && <Select.Option value="super_admin">מנהל (admin)</Select.Option>}
                        <Select.Option value="synagogue_admin">מנהל בית כנסת</Select.Option>
                        <Select.Option value="viewer">צופה</Select.Option>
                    </Select>
                );
            }
        },
        {
            title: 'בית כנסת',
            dataIndex: 'synagogueId',
            key: 'synagogueId',
            render: (synagogueId) => {
                const matching = synagogues.find((item) => item.id === synagogueId);
                return matching ? matching.name : 'כללי';
            }
        },
        {
            title: 'פעולות',
            key: 'actions',
            width: 150,
            render: (_, record) => (
                <Space>
                    <Button 
                        icon={<KeyOutlined />} 
                        onClick={() => handleChangePassword(record.username)}
                        title="שינוי סיסמה"
                    />
                    {record.username !== 'admin' && (
                        <Popconfirm
                            title="האם למחוק משתמש זה?"
                            onConfirm={() => handleDeleteUser(record.username)}
                            okText="כן"
                            cancelText="לא"
                        >
                            <Button danger icon={<DeleteOutlined />} title="מחיקה" />
                        </Popconfirm>
                    )}
                </Space>
            )
        }
    ];

    return (
        <Modal
            open={visible}
            title="ניהול משתמשים והרשאות"
            onCancel={onCancel}
            footer={null}
            width={600}
            destroyOnClose
        >
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {currentUser?.role === 'super_admin' && (
                    <Button 
                        type="default"
                        onClick={() => setIsAddSynagogueVisible(!isAddSynagogueVisible)}
                    >
                        בית כנסת חדש
                    </Button>
                )}
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => setIsAddUserVisible(!isAddUserVisible)}
                >
                    משתמש / מנהל חדש
                </Button>
            </div>

            {isAddSynagogueVisible && currentUser?.role === 'super_admin' && (
                <Form
                    form={synagogueForm}
                    layout="inline"
                    onFinish={handleCreateSynagogue}
                    style={{ marginBottom: '20px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                >
                    <Form.Item
                        name="name"
                        rules={[{ required: true, message: 'הזן שם בית כנסת' }]}
                    >
                        <Input placeholder="שם בית כנסת" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            צור
                        </Button>
                    </Form.Item>
                </Form>
            )}

            {isAddUserVisible && (
                <Form
                    form={form}
                    layout="inline"
                    onFinish={handleCreateUser}
                    initialValues={{
                        role: 'synagogue_admin',
                        synagogueId: currentUser?.role !== 'super_admin' ? currentUser?.synagogueId : undefined
                    }}
                    style={{ marginBottom: '20px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: 'הזן שם משתמש' }]}
                    >
                        <Input placeholder="שם משתמש" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'הזן סיסמה' }]}
                    >
                        <Input.Password placeholder="סיסמה" />
                    </Form.Item>
                    <Form.Item name="role" initialValue="synagogue_admin">
                        <Select style={{ width: 160 }}>
                            {currentUser?.role === 'super_admin' && <Select.Option value="super_admin">מנהל (admin)</Select.Option>}
                            <Select.Option value="synagogue_admin">מנהל בית כנסת</Select.Option>
                            <Select.Option value="viewer">צופה</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="synagogueId">
                        <Select 
                            style={{ width: 180 }} 
                            placeholder="בחר בית כנסת"
                            disabled={currentUser?.role !== 'super_admin'}
                        >
                            {synagogues.map((item) => (
                                <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            צור
                        </Button>
                    </Form.Item>
                </Form>
            )}

            <Table
                dataSource={users}
                columns={columns}
                rowKey="username"
                loading={loading}
                pagination={false}
            />
        </Modal>
    );
};

export default UserManagementModal;
