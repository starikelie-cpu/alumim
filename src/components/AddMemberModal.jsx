import React, { useState, useMemo } from 'react';
import { Modal, Form, Input, Select, Row, Col, Divider, Button, List, Tooltip, AutoComplete } from 'antd';
import { HDate } from '@hebcal/core';
import { CalendarOutlined, SearchOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { HebrewCalendarComponent } from './HebrewCalendarComponent';
import { formatHebrewDateToNumeric, formatHebrewDateToTextual, calculateAliyahInfo, getHebrewMonthNumber, gematriaToNum } from '../utils/hebrewDateUtils';

const { Option } = Select;

const AddMemberModal = ({ visible, onCancel, onSave, editingMember, members = [] }) => {
    const [form] = Form.useForm();
    const [calendar, setCalendar] = useState({ isOpen: false, field: null });
    const [nameSearch, setNameSearch] = useState('');
    const letterSelectRef = React.useRef(null);

    const formatHebrewDate = (dateObj) => {
        if (!dateObj || typeof dateObj !== 'object') return dateObj;
        return `${dateObj.hDayGematria} ${dateObj.hMonthName} ${dateObj.hYearGematria}`;
    };

    const [parashot, setParashot] = useState([]);

    React.useEffect(() => {
        fetch('http://localhost:3000/api/parshot')
            .then(res => res.json())
            .then(data => setParashot(data))
            .catch(err => console.error("Failed to fetch parashot:", err));
    }, []);

    const uniqueLastNames = useMemo(() => {
        const names = [...new Set(members.map(m => m.lastName).filter(Boolean))];
        return names.sort((a, b) => a.localeCompare(b, 'he'));
    }, [members]);

    const filteredFirstNames = useMemo(() => {
        const currentLastName = form.getFieldValue('lastName');
        if (!currentLastName) return [];
        const names = [...new Set(members
            .filter(m => m.lastName === currentLastName)
            .map(m => m.firstName)
            .filter(Boolean))];
        return names.sort((a, b) => a.localeCompare(b, 'he'));
    }, [members, form.getFieldValue('lastName')]);

    const filteredLastNames = useMemo(() => {
        return uniqueLastNames.filter(name => name.includes(nameSearch));
    }, [uniqueLastNames, nameSearch]);

    const filteredFirstNamesSearch = useMemo(() => {
        return filteredFirstNames.filter(name => name.includes(nameSearch));
    }, [filteredFirstNames, nameSearch]);

    // Populate form when editing
    React.useEffect(() => {
        if (visible && editingMember) {
            const isArchive = !!editingMember.archiveId;
            const aliyahClearFields = isArchive ? {} : {
                // Clear Aliyah tracking fields when opening "Update Aliyah" modal
                aliyah_date: '',
                aliyah_parasha: '',
                aliyah_type: '',
                days_since_aliyah: ''
            };

            const formattedMember = {
                ...editingMember,
                father_death_date: formatHebrewDateToTextual(editingMember.father_death_date || ''),
                mother_death_date: formatHebrewDateToTextual(editingMember.mother_death_date || ''),
                ...aliyahClearFields
            };
            form.setFieldsValue(formattedMember);
        } else if (!visible) {
            form.resetFields();
        }
    }, [visible, editingMember, form]);

    const handleFinish = async (values) => {
        const allFormValues = form.getFieldsValue(true);
        const aliyahInfo = calculateAliyahInfo(values.aliyah_date);

        const memberData = {
            ...(editingMember || {}),
            ...allFormValues,
            // Only calculate parasha if user didn't manually select one
            aliyah_parasha: allFormValues.aliyah_parasha || aliyahInfo.parasha,
            days_since_aliyah: aliyahInfo.days_since_aliyah,
        };

        try {
            await onSave(memberData);
            form.resetFields();
            // Explicitly clear Aliyah fields as requested
            form.setFieldsValue({
                aliyah_date: '',
                aliyah_parasha: '',
                days_since_aliyah: '',
                aliyah_type: ''
            });
        } catch (error) {
            console.error("Save failed, keeping modal open", error);
        }
    };

    const openCalendar = (field) => {
        setCalendar({ isOpen: true, field });
    };

    const handleDateSelect = (dateObj) => {
        if (calendar.field === 'aliyah_date') {
            const hDay = gematriaToNum(dateObj.hDayGematria);
            const hMonth = getHebrewMonthNumber(dateObj.hMonthName, dateObj.hYear);
            const hYear = dateObj.hYear;
            const hd = new HDate(hDay, hMonth, hYear);

            const dateString = formatHebrewDate(dateObj);
            const aliyahInfo = calculateAliyahInfo(hd);
            form.setFieldsValue({
                aliyah_date: dateString,  // Keep the original date as selected
                aliyah_parasha: aliyahInfo.parasha,
                days_since_aliyah: aliyahInfo.days_since_aliyah
            });
        } else {
            const dateString = formatHebrewDate(dateObj);
            form.setFieldsValue({ [calendar.field]: dateString });
        }

        setCalendar({ isOpen: false, field: null });
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
                        {editingMember ? 'עריכת פרטי מתפלל' : 'הוספת מתפלל חדש'}
                    </div>
                }
                open={visible}
                onCancel={onCancel}
                onOk={() => form.submit()}
                width={860}
                zIndex={1050}
                okText="שמור"
                cancelText="ביטול"
                styles={{
                    body: {
                        backgroundColor: '#f0f2f5',
                        padding: '16px',
                        borderRadius: '12px',
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)'
                    },
                    content: {
                        backgroundColor: '#ffffff',
                        color: '#002766',
                        borderRadius: '16px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 5px 15px rgba(0,0,0,0.1)'
                    },
                    header: {
                        background: '#bae7ff',
                        color: '#002766',
                        padding: '12px 24px',
                        marginBottom: 0,
                        border: '8px solid #1890ff',
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
                    .ant-input, .ant-select-selector { 
                        border-radius: 8px !important;
                        border: 1px solid #d9d9d9 !important;
                        box-shadow: 0 2px 0 rgba(0,0,0,0.02) !important;
                        transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1) !important;
                        background: #fff !important;
                    }
                    .ant-input:hover, .ant-select-selector:hover {
                        border-color: #40a9ff !important;
                        box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15) !important;
                        transform: translateY(-1px);
                    }
                    .ant-input:focus, .ant-select-focused .ant-select-selector {
                        border-color: #1890ff !important;
                        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2), 0 8px 16px rgba(24, 144, 255, 0.1) !important;
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
                    .name-selection-item:hover { background-color: #f0f5ff; cursor: pointer; }
                `}</style>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFinish}
                    direction="rtl"
                    style={{ color: '#002766' }}
                >
                    <div className="premium-card">
                        <Row gutter={24}>
                            <Col span={8}>
                                <Form.Item
                                    name="letter"
                                    label={
                                        <span>
                                            אות{' '}
                                            <Tooltip
                                                title={
                                                    <div style={{ color: '#006400', direction: 'rtl' }}>
                                                        <div>א=אורח (לא ייוחס בהדפסת עולים)</div>
                                                        <div>נפ=נפטר (הרשומה תעבור לארכיון נפטרים ותימחק מרשימת המתפללים)</div>
                                                    </div>
                                                }
                                                placement="bottomLeft"
                                                zIndex={1100}
                                                overlayInnerStyle={{
                                                    backgroundColor: '#ffffcc',
                                                    border: '1px solid #d9d9d9',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    maxWidth: '350px'
                                                }}
                                            >
                                                <QuestionCircleOutlined style={{ color: '#1890ff', cursor: 'help', fontSize: '14px' }} />
                                            </Tooltip>
                                        </span>
                                    }
                                >
                                    <Select 
                                        ref={letterSelectRef}
                                        mode="tags" 
                                        placeholder="א' או הקלד..." 
                                        allowClear 
                                        tokenSeparators={[',']}
                                        onChange={() => {
                                            // Close the dropdown after selection
                                            if (letterSelectRef.current) {
                                                letterSelectRef.current.blur();
                                            }
                                        }}
                                    >
                                        <Option value="א">א</Option>
                                        <Option value='נפ'>נפ</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="status" label="מעמד">
                                    <Select placeholder="בחר מעמד" allowClear>
                                        <Option value="">ריק</Option>
                                        <Option value="כהן">כהן</Option>
                                        <Option value="לוי">לוי</Option>
                                        <Option value="ישראל">ישראל</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="title" label="תואר">
                                    <Select placeholder="בחר תואר" allowClear>
                                        <Option value="הרב">הרב</Option>
                                        <Option value="מר">מר</Option>
                                        <Option value="ה'">ה'</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col span={8}>
                                <Form.Item name="lastName" label="שם משפחה" rules={[{ required: true, message: 'שדה חובה' }]}>
                                    <AutoComplete
                                        placeholder="הקלד שם משפחה..."
                                        allowClear
                                        options={uniqueLastNames.map(name => ({ value: name }))}
                                        filterOption={(inputValue, option) =>
                                            option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                        }
                                        onChange={(val) => {
                                             form.setFieldsValue({ lastName: val });
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="firstName" label="שם פרטי" rules={[{ required: true, message: 'שדה חובה' }]}>
                                    <AutoComplete
                                        placeholder="הקלד שם פרטי..."
                                        allowClear
                                        options={filteredFirstNames.map(name => ({ value: name }))}
                                        filterOption={(inputValue, option) =>
                                            option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                        }
                                        onChange={(val) => {
                                            form.setFieldsValue({ firstName: val });
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="fatherName" label="שם האב">
                                    <Input placeholder="למשל: אברהם" allowClear />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <Divider orientation="right">תאריכי פטירה (לוח עברי)</Divider>

                    <div className="premium-card">
                        <Row gutter={24}>
                            <Col span={8}>
                                <Form.Item name="father_death_date" label="תאריך פטירת אב">
                                    <Input
                                        readOnly
                                        allowClear
                                        placeholder="בחר תאריך..."
                                        onClick={(e) => {
                                            if (e.target.tagName !== 'INPUT') return;
                                            openCalendar('father_death_date');
                                        }}
                                        suffix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="mother_death_date" label="תאריך פטירת אם">
                                    <Input
                                        readOnly
                                        allowClear
                                        placeholder="בחר תאריך..."
                                        onClick={(e) => {
                                            if (e.target.tagName !== 'INPUT') return;
                                            openCalendar('mother_death_date');
                                        }}
                                        suffix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="barMitzvahParasha" label="פרשת בר מצווה">
                                    <Select placeholder="בחר פרשה" showSearch optionFilterProp="children" allowClear>
                                        {parashot.map(p => <Option key={p} value={p}>{p}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    {editingMember && (
                        <>
                            <Divider orientation="right">מעקב עליות לתורה</Divider>

                            <div className="premium-card">
                                <Row gutter={24}>
                                    <Col span={8}>
                                        <Form.Item name="aliyah_date" label="תאריך עליה">
                                            <Input
                                                readOnly
                                                allowClear
                                                placeholder="בחר תאריך..."
                                                onClick={(e) => {
                                                    if (e.target.tagName !== 'INPUT') return;
                                                    openCalendar('aliyah_date');
                                                }}
                                                suffix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="aliyah_parasha" label="פרשת עליה">
                                            <Input readOnly placeholder="תתמלא אוטומטית" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="aliyah_type" label="סוג עליה">
                                            <Select placeholder="בחר סוג עליה" allowClear>
                                                <Option value="עליה">עליה</Option>
                                                <Option value="כהן">כהן</Option>
                                                <Option value="לוי">לוי</Option>
                                                <Option value="מפטיר">מפטיר</Option>
                                                <Option value="חזק">חזק</Option>
                                                <Option value="עשרת הדברות">עשרת הדברות</Option>
                                                <Option value="שירת הים">שירת הים</Option>
                                                <Option value="זכור">זכור</Option>
                                                <Option value="חתן בראשית">חתן בראשית</Option>
                                                <Option value="חתן תורה">חתן תורה</Option>
                                                <Option value="תוכחה">תוכחה</Option>
                                                <Option value="מפטיר יונה">מפטיר יונה</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={24}>
                                    <Col span={8}>
                                        <Form.Item name="days_since_aliyah" label="זמן שעבר (בימים)">
                                            <Input readOnly type="number" placeholder="יחושב אוטומטית..." />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </div>
                        </>
                    )}
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

export default AddMemberModal;
