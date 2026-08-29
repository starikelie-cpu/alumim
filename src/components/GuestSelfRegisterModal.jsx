import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col, Divider, Button, Tooltip, AutoComplete, message } from 'antd';
import { UserAddOutlined, CalendarOutlined, QuestionCircleOutlined, SafetyOutlined } from '@ant-design/icons';
import { HebrewCalendarComponent } from './HebrewCalendarComponent';
import { formatHebrewDateToTextual } from '../utils/hebrewDateUtils';
import { API_BASE, isMobile } from '../config';

const { Option } = Select;

const GuestSelfRegisterModal = ({ visible, onCancel, onSuccess, synagogueId, synagogueName }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [calendar, setCalendar] = useState({ isOpen: false, field: null });
    const [parashot, setParashot] = useState([]);
    const letterSelectRef = React.useRef(null);

    useEffect(() => {
        if (visible) {
            fetch(`${API_BASE}/api/parshot`)
                .then(res => res.json())
                .then(data => setParashot(data))
                .catch(err => console.error("Failed to fetch parashot:", err));
        }
    }, [visible]);

    const formatHebrewDate = (dateObj) => {
        if (!dateObj || typeof dateObj !== 'object') return dateObj;
        return `${dateObj.hDayGematria} ${dateObj.hMonthName} ${dateObj.hYearGematria}`;
    };

    const openCalendar = (field) => {
        setCalendar({ isOpen: true, field });
    };

    const handleDateSelect = (dateObj) => {
        const dateString = formatHebrewDate(dateObj);
        form.setFieldsValue({ [calendar.field]: dateString });
        setCalendar({ isOpen: false, field: null });
    };

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
                letter: ['א'],
                father_death_date: formatHebrewDateToTextual(values.father_death_date || ''),
                mother_death_date: formatHebrewDateToTextual(values.mother_death_date || ''),
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

            try {
                localStorage.setItem(`guest_self_registered_${synagogueId}`, data.member.id || 'registered');
                localStorage.setItem(`guest_self_registered_date_${synagogueId}`, new Date().toISOString());
                sessionStorage.setItem(`just_self_registered_${synagogueId}`, 'true');
                if (data.member && data.member.id) {
                    localStorage.setItem('last_self_registered_member_id', String(data.member.id));
                    localStorage.setItem('last_self_registered_synagogue_id', String(synagogueId));
                }
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
        <>
            <Modal
                title={
                    <div style={{
                        textAlign: 'center',
                        fontSize: '22px',
                        fontWeight: '800',
                        color: '#002766',
                        textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        letterSpacing: '1px'
                    }}>
                        הרשמה עצמית כמתפלל {synagogueName ? `(${synagogueName})` : ''}
                    </div>
                }
                open={visible}
                onCancel={onCancel}
                onOk={() => form.submit()}
                width={isMobile() ? '96vw' : 840}
                style={{ top: isMobile() ? 10 : 80, maxWidth: '100vw' }}
                zIndex={1050}
                okText="אישור והרשמה"
                cancelText="ביטול"
                confirmLoading={loading}
                styles={{
                    body: {
                        backgroundColor: '#f0f2f5',
                        padding: isMobile() ? '10px 8px' : '16px',
                        borderRadius: '12px',
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
                        maxHeight: isMobile() ? '82vh' : 'auto',
                        overflowY: 'auto'
                    },
                    content: {
                        backgroundColor: '#ffffff',
                        color: '#002766',
                        borderRadius: '16px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 5px 15px rgba(0,0,0,0.1)',
                        padding: isMobile() ? '10px 8px' : '20px 24px'
                    },
                    header: {
                        background: '#bae7ff',
                        color: '#002766',
                        padding: '12px 24px',
                        marginBottom: 0,
                        border: '8px solid #52c41a',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px'
                    }
                }}
            >
                <style>{`
                    .ant-form-item { margin-bottom: 12px !important; }
                    .ant-form-item-label > label { 
                        font-weight: 600 !important; 
                        color: #002766 !important;
                        font-size: 17px;
                    }
                    .ant-input, .ant-select-selector, .ant-input-affix-wrapper { 
                        border-radius: 8px !important;
                        border: 1px solid #d9d9d9 !important;
                        box-shadow: 0 2px 0 rgba(0,0,0,0.02) !important;
                        transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1) !important;
                        background: #fff !important;
                        font-size: 16px !important;
                    }
                    .ant-input:hover, .ant-select-selector:hover, .ant-input-affix-wrapper:hover {
                        border-color: #52c41a !important;
                        box-shadow: 0 4px 12px rgba(82, 196, 26, 0.15) !important;
                        transform: translateY(-1px);
                    }
                    .ant-input:focus, .ant-select-focused .ant-select-selector, .ant-input-affix-wrapper-focused {
                        border-color: #52c41a !important;
                        box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.2), 0 8px 16px rgba(82, 196, 26, 0.1) !important;
                        transform: translateY(-2px);
                    }
                    .premium-card {
                        background: #ffffff;
                        padding: 16px;
                        border-radius: 12px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                        margin-bottom: 16px;
                        border: 1px solid #f0f0f0;
                    }
                    .ant-divider-horizontal.ant-divider-with-text { 
                        margin: 16px 0 !important;
                        font-weight: 700 !important;
                        color: #003a8c !important;
                    }
                `}</style>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFinish}
                    direction="rtl"
                    style={{ color: '#002766' }}
                >
                    <div className="premium-card">
                        <Row gutter={[16, 12]}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="status" label="מעמד">
                                    <Select placeholder="בחר מעמד" allowClear>
                                        <Option value="">ריק</Option>
                                        <Option value="כהן">כהן</Option>
                                        <Option value="לוי">לוי</Option>
                                        <Option value="ישראל">ישראל</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="title" label="תואר">
                                    <Select placeholder="בחר תואר" allowClear>
                                        <Option value="הרב">הרב</Option>
                                        <Option value="מר">מר</Option>
                                        <Option value="ה'">ה'</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={[16, 12]}>
                            <Col xs={24} sm={8}>
                                <Form.Item name="lastName" label="שם משפחה" rules={[{ required: true, message: 'שדה חובה' }]}>
                                    <Input placeholder="הקלד שם משפחה..." allowClear />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Form.Item name="firstName" label="שם פרטי" rules={[{ required: true, message: 'שדה חובה' }]}>
                                    <Input placeholder="הקלד שם פרטי..." allowClear />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Form.Item name="fatherName" label="שם האב">
                                    <Input placeholder="למשל: אברהם" allowClear />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <Divider orientation="right">תאריכי פטירה (לוח עברי)</Divider>

                    <div className="premium-card">
                        <Row gutter={[16, 12]}>
                            <Col xs={24} sm={8}>
                                <Form.Item name="father_death_date" label="תאריך פטירת אב">
                                    <Input
                                        readOnly
                                        allowClear
                                        placeholder="בחר תאריך..."
                                        onClick={(e) => {
                                            if (e.target.tagName !== 'INPUT') return;
                                            openCalendar('father_death_date');
                                        }}
                                        suffix={<CalendarOutlined style={{ color: '#52c41a' }} />}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Form.Item name="mother_death_date" label="תאריך פטירת אם">
                                    <Input
                                        readOnly
                                        allowClear
                                        placeholder="בחר תאריך..."
                                        onClick={(e) => {
                                            if (e.target.tagName !== 'INPUT') return;
                                            openCalendar('mother_death_date');
                                        }}
                                        suffix={<CalendarOutlined style={{ color: '#52c41a' }} />}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Form.Item name="barMitzvahParasha" label="פרשת בר מצווה">
                                    <AutoComplete
                                        placeholder="בחר או הקלד פרשה..."
                                        allowClear
                                        options={parashot.map(p => ({ value: p }))}
                                        filterOption={(inputValue, option) =>
                                            option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                        }
                                        onChange={(val) => {
                                            form.setFieldsValue({ barMitzvahParasha: val });
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>
                </Form>
            </Modal>

            <HebrewCalendarComponent
                isOpen={calendar.isOpen}
                onClose={() => setCalendar({ isOpen: false, field: null })}
                onSelect={handleDateSelect}
                selectedValue={calendar.field ? form.getFieldValue(calendar.field) : null}
            />
        </>
    );
};

export default GuestSelfRegisterModal;
