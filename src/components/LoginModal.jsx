import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { API_BASE, getPlatform } from '../config';

const LoginModal = ({ visible, onCancel, onLoginSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const handleLogin = async (values) => {
        setLoading(true);
        try {
            const platform = getPlatform ? getPlatform() : 'web';
            const synName = localStorage.getItem('localSynagogueName') || null;
            const screen = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null;
            const cleanValues = {
                username: values.username ? String(values.username).trim() : '',
                password: values.password ? String(values.password).trim() : '',
                platform,
                synagogueName: synName,
                screen
            };
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanValues)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'ההתחברות נכשלה');
            }

            message.success(`ברוך הבא, ${data.user.username}!`);
            onLoginSuccess(data.token, data.user);
            form.resetFields();
            onCancel();
        } catch (error) {
            console.error('Login error:', error);
            message.error(error.message || 'שם משתמש או סיסמה שגויים');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={visible}
            title="התחברות מנהל מערכת"
            okText="התחבר"
            cancelText="ביטול"
            onCancel={onCancel}
            footer={null}
            destroyOnClose
            width={400}
        >
            <Form
                form={form}
                name="login_form"
                onFinish={handleLogin}
                layout="vertical"
            >
                <Form.Item
                    name="username"
                    label="שם משתמש"
                    rules={[{ required: true, message: 'נא להזין שם משתמש!' }]}
                >
                    <Input
                        prefix={<UserOutlined />}
                        placeholder="שם משתמש"
                        size="large"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoComplete="username"
                    />
                </Form.Item>

                <Form.Item
                    name="password"
                    label="סיסמה"
                    rules={[{ required: true, message: 'נא להזין סיסמה!' }]}
                >
                    <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="סיסמה"
                        size="large"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoComplete="current-password"
                    />
                </Form.Item>

                <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
                    <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                        התחבר
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default LoginModal;
