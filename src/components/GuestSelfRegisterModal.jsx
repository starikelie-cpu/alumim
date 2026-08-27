import React, { useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, Button, message } from 'antd';
import { UserAddOutlined, CheckCircleOutlined, SafetyOutlined } from '@ant-design/icons';
import { API_BASE, isMobile } from '../config';

const { Option } = Select;

const GuestSelfRegisterModal = ({ visible, onCancel, onSuccess, synagogueId, synagogueName }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleFinish = async (values) => {
        if (!synagogueId) {
            message.error('יש לבחור בית כנסת תחילה');
            return;
        }

        setLoading(true);
        try {
            const memberData = {
                ...values,
                synagogueId: synagogueId,
                letter: ['א'], // Default 'א' for guest worshipper
                isSelfRegistered: true,
                registeredAt: new Date().toISOString()
            };

            const response = await fetch(`${API_BASE}/api/members/self-register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memberData)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'הרשמה עצמית נכשלה');
            }

            // Save registration token locally for one-time protection
            try {
                localStorage.setItem(`guest_self_registered_${synagogueId}`, data.member.id || 'registered');
                localStorage.setItem(`guest_self_registered_date_${synagogueId}`, new Date().toISOString());
            } catch (e) {}

            message.success('נרשמת בהצלחה כמתפלל בבית הכנסת!');
            form.resetFields();
            onSuccess(data.member);
        } catch (err) {
            console.error('Self-register error:', err);
            message.error(err.message || 'חלה שגיאה בביצוע ההרשמה העצמית');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={visible}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#002766' }}>
                    <UserAddOutlined style={{ color: '#52c41a', fontSize: 22 }} />
                    <span style={{ fontSize: 18, fontWeight: 700 }}>
                        הרשמה עצמית כמתפלל {synagogueName ? `בבית הכנסת: ${synagogueName}` : ''}
                    </span>
                </div>
            }
            onCancel={onCancel}
            footer={null}
            width={isMobile() ? '96vw' : 650}
            centered
            destroyOnClose
            styles={{
                header: { background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', padding: '14px 20px', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #91d5ff' },
                content: { borderRadius: 12, overflow: 'hidden' }
            }}
        >
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14, color: '#274e13', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                <span>ניתן להירשם כמתפלל **חד-פעמי** בבית כנסת זה. הפרטים יישמרו ישירות במערכת בית הכנסת.</span>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                direction="rtl"
            >
                {synagogueName && (
                    <Form.Item label="בית כנסת" style={{ marginBottom: 12 }}>
                        <Input value={synagogueName} disabled style={{ fontWeight: 'bold', background: '#f5f5f5', color: '#002766' }} />
                    </Form.Item>
                )}

                <Row gutter={12}>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="lastName"
                            label="שם משפחה"
                            rules={[{ required: true, message: 'נא להזין שם משפחה' }]}
                            style={{ marginBottom: 12 }}
                        >
                            <Input placeholder="לדוגמה: כהן" size="large" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="firstName"
                            label="שם פרטי"
                            rules={[{ required: true, message: 'נא להזין שם פרטי' }]}
                            style={{ marginBottom: 12 }}
                        >
                            <Input placeholder="לדוגמה: אברהם" size="large" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={12}>
                    <Col xs={24} sm={8}>
                        <Form.Item name="fatherName" label="שם האב" style={{ marginBottom: 12 }}>
                            <Input placeholder="לדוגמה: יצחק" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item name="status" label="מעמד" style={{ marginBottom: 12 }}>
                            <Select placeholder="בחר מעמד" allowClear>
                                <Option value="כהן">כהן</Option>
                                <Option value="לוי">לוי</Option>
                                <Option value="ישראל">ישראל</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item name="title" label="תואר" style={{ marginBottom: 12 }}>
                            <Select placeholder="בחר תואר" allowClear>
                                <Option value="הרב">הרב</Option>
                                <Option value="מר">מר</Option>
                                <Option value="ה'">ה'</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={12}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="phone" label="מספר טלפון / נייד" style={{ marginBottom: 12 }}>
                            <Input placeholder="050-0000000" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="barMitzvahParasha" label="פרשת בר מצווה" style={{ marginBottom: 12 }}>
                            <Input placeholder="לדוגמה: בראשית" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="address" label="כתובת / הערות נוספות" style={{ marginBottom: 20 }}>
                    <Input.TextArea rows={2} placeholder="כתובת מגורים או הערות..." />
                </Form.Item>

                <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        size="large"
                        icon={<SafetyOutlined />}
                        style={{ background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)', borderColor: '#389e0d', fontWeight: 'bold', minWidth: 200 }}
                    >
                        אישור והרשמה
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default GuestSelfRegisterModal;
