import React, { useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, Divider } from 'antd';
import { HDate } from '@hebcal/core';
import { CalendarOutlined } from '@ant-design/icons';
import { HebrewCalendarComponent } from './HebrewCalendarComponent';
import { formatHebrewDateToTextual, getHebrewMonthNumber, gematriaToNum } from '../utils/hebrewDateUtils';
import { API_BASE } from '../config';

const { Option } = Select;

const AddNiftarModal = ({ visible, onCancel, onSave, editingNiftar }) => {
    const [form] = Form.useForm();
    const [calendar, setCalendar] = useState({ isOpen: false, field: null });
    const [parashot, setParashot] = useState([]);

    React.useEffect(() => {
        fetch(`${API_BASE}/api/parshot`)
            .then(res => res.json())
            .then(data => setParashot(data))
            .catch(err => console.error("Failed to fetch parashot:", err));
    }, []);

    // Populate form when editing
    React.useEffect(() => {
        if (visible && editingNiftar) {
            form.setFieldsValue({
                ...editingNiftar,
                death_date: formatHebrewDateToTextual(editingNiftar.death_date || ''),
            });
        } else if (!visible) {
            form.resetFields();
        }
    }, [visible, editingNiftar, form]);

    const handleFinish = async (values) => {
        const allFormValues = form.getFieldsValue(true);
        const niftarData = {
            ...(editingNiftar || {}),
            ...allFormValues,
        };

        try {
            await onSave(niftarData);
            form.resetFields();
        } catch (error) {
            console.error("Save failed, keeping modal open", error);
        }
    };

    const openCalendar = (field) => {
        setCalendar({ isOpen: true, field });
    };

    const handleDateSelect = (dateObj) => {
        const dateString = `${dateObj.hDayGematria} ${dateObj.hMonthName} ${dateObj.hYearGematria}`;
        form.setFieldsValue({ [calendar.field]: dateString });
        setCalendar({ isOpen: false, field: null });
    };

    return (
        <>
            <Modal
                title={
                    <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#00008B' }}>
                        {editingNiftar ? 'עריכת נפטר' : 'הוסף נפטר חדש'}
                    </div>
                }
                open={visible}
                onCancel={onCancel}
                onOk={() => form.submit()}
                width={700}
                zIndex={1050}
                okText="שמור"
                cancelText="ביטול"
                styles={{
                    body: { backgroundColor: '#e6f7ff', padding: '10px', borderRadius: '8px' },
                    content: { backgroundColor: '#e6f7ff', color: '#002766' },
                    header: { backgroundColor: '#e6f7ff', color: '#002766', padding: '10px 24px', marginBottom: 0 }
                }}
            >
                <style>{`
                    .ant-form-item { margin-bottom: 6px !important; }
                    .ant-divider-horizontal.ant-divider-with-text { margin: 8px 0 !important; }
                `}</style>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFinish}
                    direction="rtl"
                    style={{ color: '#002766' }}
                >
                    <Row gutter={16}>
                        <Col span={10}>
                            <Form.Item name="status" label="מעמד">
                                <Select placeholder="בחר מעמד" allowClear>
                                    <Option value="">ריק</Option>
                                    <Option value="כהן">כהן</Option>
                                    <Option value="לוי">לוי</Option>
                                    <Option value="ישראל">ישראל</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={14}>
                            <Form.Item name="title" label="תואר">
                                <Select placeholder="בחר תואר" allowClear>
                                    <Option value="הרב">הרב</Option>
                                    <Option value="מר">מר</Option>
                                    <Option value="ה'">ה'</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="lastName" label="שם משפחה" rules={[{ required: true, message: 'שדה חובה' }]}>
                                <Input allowClear />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="firstName" label="שם פרטי" rules={[{ required: true, message: 'שדה חובה' }]}>
                                <Input allowClear />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="fatherName" label="שם האב">
                        <Input placeholder="למשל: אברהם" allowClear />
                    </Form.Item>

                    <Divider orientation="right">תאריך פטירה (לוח עברי)</Divider>

                    <Form.Item name="death_date" label="תאריך פטירה">
                        <Input
                            readOnly
                            allowClear
                            placeholder="בחר תאריך..."
                            onClick={(e) => {
                                if (e.target.tagName !== 'INPUT') return;
                                openCalendar('death_date');
                            }}
                            suffix={<CalendarOutlined style={{ color: '#bfbfbf' }} />}
                        />
                    </Form.Item>

                    <Form.Item name="notes" label="הערות">
                        <Input.TextArea rows={2} allowClear placeholder="הערות נוספות..." />
                    </Form.Item>
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

export default AddNiftarModal;
