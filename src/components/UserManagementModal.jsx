import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, Form, Input, Select, Popconfirm, Space, message, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';

const UserManagementModal = ({ visible, onCancel, token }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isAddUserVisible, setIsAddUserVisible] = useState(false);
    const [form] = Form.useForm();

    const fetchHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/users', {
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

    useEffect(() => {
        if (visible && token) {
            fetchUsers();
        }
    }, [visible, token]);

    const handleCreateUser = async (values) => {
        try {
            const response = await fetch('http://localhost:3000/api/users', {
                method: 'POST',
                headers: fetchHeaders,
                body: JSON.stringify(values)
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

    const handleDeleteUser = async (username) => {
        try {
            const response = await fetch(`http://localhost:3000/api/users/${username}`, {
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
            const response = await fetch(`http://localhost:3000/api/users/${username}`, {
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
            const response = await fetch(`http://localhost:3000/api/users/${username}`, {
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
                return (
                    <Select
                        value={role}
                        onChange={(val) => handleChangeRole(record.username, val)}
                        style={{ width: 120 }}
                    >
                        <Select.Option value="admin">מנהל</Select.Option>
                        <Select.Option value="viewer">צופה</Select.Option>
                    </Select>
                );
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
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => setIsAddUserVisible(!isAddUserVisible)}
                >
                    משתמש חדש
                </Button>
            </div>

            {isAddUserVisible && (
                <Form
                    form={form}
                    layout="inline"
                    onFinish={handleCreateUser}
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
                    <Form.Item name="role" initialValue="viewer">
                        <Select style={{ width: 100 }}>
                            <Select.Option value="admin">מנהל</Select.Option>
                            <Select.Option value="viewer">צופה</Select.Option>
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
