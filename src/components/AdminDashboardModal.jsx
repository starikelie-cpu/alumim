import React, { useState, useEffect } from 'react';
import {
    Modal, Tabs, Table, Button, Form, Input, Select, Popconfirm, Space,
    message, Tag, Card, Statistic, Row, Col, Tooltip, Badge, Divider, Typography
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, KeyOutlined, EditOutlined, BankOutlined,
    TeamOutlined, BarChartOutlined, CheckOutlined, CloseOutlined, CrownOutlined,
    UserOutlined, EnvironmentOutlined, PhoneOutlined
} from '@ant-design/icons';
import { API_BASE } from '../config';
import { normalizeRole } from '../../accessControl';

const { Text, Title } = Typography;

const ROLE_LABELS = {
    super_admin: { label: 'מנהל על', color: 'gold' },
    synagogue_admin: { label: 'מנהל בית כנסת', color: 'blue' },
    viewer: { label: 'צופה', color: 'default' },
};

const AdminDashboardModal = ({ visible, onCancel, token, currentUser, members = [], niftarim = [] }) => {
    const [synagogues, setSynagogues] = useState([]);
    const [users, setUsers] = useState([]);
    const [loadingSyn, setLoadingSyn] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Inline edit state for synagogue row
    const [editingSynId, setEditingSynId] = useState(null);
    const [editingSynForm] = Form.useForm();

    // Inline edit state for user row
    const [editingUserId, setEditingUserId] = useState(null);
    const [editingUserForm] = Form.useForm();

    const [addSynForm] = Form.useForm();
    const [addUserForm] = Form.useForm();
    const [showAddSyn, setShowAddSyn] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [savingSyn, setSavingSyn] = useState(false);
    const [savingUser, setSavingUser] = useState(false);

    const isSuperAdmin = currentUser?.role === 'super_admin';

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const fetchSynagogues = async () => {
        setLoadingSyn(true);
        try {
            const res = await fetch(`${API_BASE}/api/synagogues`, { headers });
            if (!res.ok) throw new Error();
            setSynagogues(await res.json());
        } catch { message.error('שגיאה בטעינת בתי כנסת'); }
        finally { setLoadingSyn(false); }
    };

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const res = await fetch(`${API_BASE}/api/users`, { headers });
            if (!res.ok) throw new Error();
            setUsers(await res.json());
        } catch { message.error('שגיאה בטעינת משתמשים'); }
        finally { setLoadingUsers(false); }
    };

    useEffect(() => {
        if (visible && token) {
            fetchSynagogues();
            fetchUsers();
        }
    }, [visible, token]);

    // ── Synagogue actions ─────────────────────────────────────────────────────

    const handleAddSynagogue = async (values) => {
        setSavingSyn(true);
        try {
            const res = await fetch(`${API_BASE}/api/synagogues`, {
                method: 'POST', headers, body: JSON.stringify(values)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'שגיאה');
            message.success('בית כנסת נוצר בהצלחה');
            addSynForm.resetFields();
            setShowAddSyn(false);
            fetchSynagogues();
        } catch (e) { message.error(e.message); }
        finally { setSavingSyn(false); }
    };

    const startEditSyn = (record) => {
        setEditingSynId(record.id);
        editingSynForm.setFieldsValue({ name: record.name, address: record.address || '', phone: record.phone || '' });
    };

    const saveSyn = async (id) => {
        try {
            const values = await editingSynForm.validateFields();
            const res = await fetch(`${API_BASE}/api/synagogues/${id}`, {
                method: 'PUT', headers, body: JSON.stringify(values)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'שגיאה');
            message.success('בית כנסת עודכן');
            setEditingSynId(null);
            fetchSynagogues();
        } catch (e) { if (e.message) message.error(e.message); }
    };

    const deleteSynagogue = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/api/synagogues/${id}`, { method: 'DELETE', headers });
            if (!res.ok) throw new Error((await res.json()).error || 'שגיאה');
            message.success('בית כנסת נמחק');
            fetchSynagogues();
        } catch (e) { message.error(e.message); }
    };

    // ── User actions ──────────────────────────────────────────────────────────

    const handleAddUser = async (values) => {
        setSavingUser(true);
        try {
            const res = await fetch(`${API_BASE}/api/users`, {
                method: 'POST', headers, body: JSON.stringify(values)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'שגיאה');
            message.success('משתמש נוצר בהצלחה');
            addUserForm.resetFields();
            setShowAddUser(false);
            fetchUsers();
        } catch (e) { message.error(e.message); }
        finally { setSavingUser(false); }
    };

    const startEditUser = (record) => {
        setEditingUserId(record.username);
        editingUserForm.setFieldsValue({
            role: normalizeRole(record.role),
            synagogueId: record.synagogueId || undefined
        });
    };

    const saveUser = async (username) => {
        try {
            const values = await editingUserForm.validateFields();
            const res = await fetch(`${API_BASE}/api/users/${username}`, {
                method: 'PUT', headers, body: JSON.stringify(values)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'שגיאה');
            message.success('משתמש עודכן');
            setEditingUserId(null);
            fetchUsers();
        } catch (e) { if (e.message) message.error(e.message); }
    };

    const changePassword = async (username) => {
        const pw = window.prompt(`סיסמה חדשה עבור ${username}:`);
        if (!pw) return;
        if (pw.trim().length < 4) { message.error('סיסמה חייבת להכיל לפחות 4 תווים'); return; }
        try {
            const res = await fetch(`${API_BASE}/api/users/${username}`, {
                method: 'PUT', headers, body: JSON.stringify({ password: pw.trim() })
            });
            if (!res.ok) throw new Error();
            message.success('סיסמה עודכנה');
        } catch { message.error('שגיאה בעדכון סיסמה'); }
    };

    const deleteUser = async (username) => {
        try {
            const res = await fetch(`${API_BASE}/api/users/${username}`, { method: 'DELETE', headers });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'שגיאה');
            message.success('משתמש נמחק');
            fetchUsers();
        } catch (e) { message.error(e.message); }
    };

    // ── Statistics ────────────────────────────────────────────────────────────

    const synStats = synagogues.map(s => ({
        ...s,
        memberCount: members.filter(m => m.synagogueId === s.id).length,
        niftarCount: niftarim.filter(n => n.synagogueId === s.id).length,
        userCount: users.filter(u => u.synagogueId === s.id).length,
    }));

    // ── Synagogues table columns ──────────────────────────────────────────────

    const synColumns = [
        {
            title: 'שם בית כנסת',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) =>
                editingSynId === record.id ? (
                    <Form form={editingSynForm} layout="inline" style={{ gap: 4 }}>
                        <Form.Item name="name" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                            <Input size="small" style={{ width: 140 }} />
                        </Form.Item>
                    </Form>
                ) : (
                    <Space><BankOutlined style={{ color: '#1890ff' }} /><strong>{name}</strong></Space>
                )
        },
        {
            title: 'כתובת',
            dataIndex: 'address',
            key: 'address',
            render: (addr, record) =>
                editingSynId === record.id ? (
                    <Form form={editingSynForm} layout="inline">
                        <Form.Item name="address" style={{ marginBottom: 0 }}>
                            <Input size="small" style={{ width: 160 }} prefix={<EnvironmentOutlined />} />
                        </Form.Item>
                    </Form>
                ) : addr || <Text type="secondary">—</Text>
        },
        {
            title: 'טלפון',
            dataIndex: 'phone',
            key: 'phone',
            render: (phone, record) =>
                editingSynId === record.id ? (
                    <Form form={editingSynForm} layout="inline">
                        <Form.Item name="phone" style={{ marginBottom: 0 }}>
                            <Input size="small" style={{ width: 120 }} prefix={<PhoneOutlined />} />
                        </Form.Item>
                    </Form>
                ) : phone || <Text type="secondary">—</Text>
        },
        {
            title: 'מתפללים',
            key: 'memberCount',
            align: 'center',
            render: (_, record) => {
                const s = synStats.find(x => x.id === record.id);
                return <Badge count={s?.memberCount || 0} showZero color="#1890ff" />;
            }
        },
        {
            title: 'פעולות',
            key: 'actions',
            align: 'center',
            render: (_, record) =>
                editingSynId === record.id ? (
                    <Space>
                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => saveSyn(record.id)}>שמור</Button>
                        <Button size="small" icon={<CloseOutlined />} onClick={() => setEditingSynId(null)}>בטל</Button>
                    </Space>
                ) : (
                    <Space>
                        <Tooltip title="עריכה">
                            <Button size="small" icon={<EditOutlined />} onClick={() => startEditSyn(record)} />
                        </Tooltip>
                        <Popconfirm
                            title="למחוק בית כנסת זה?"
                            onConfirm={() => deleteSynagogue(record.id)}
                            okText="כן" cancelText="לא"
                        >
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                )
        }
    ];

    // ── Users table columns ───────────────────────────────────────────────────

    const userColumns = [
        {
            title: 'שם משתמש',
            dataIndex: 'username',
            key: 'username',
            render: (name, record) => (
                <Space>
                    {record.role === 'super_admin' ? <CrownOutlined style={{ color: '#faad14' }} /> : <UserOutlined style={{ color: '#1890ff' }} />}
                    <strong>{name}</strong>
                </Space>
            )
        },
        {
            title: 'הרשאה',
            dataIndex: 'role',
            key: 'role',
            render: (role, record) => {
                const norm = normalizeRole(role);
                const info = ROLE_LABELS[norm] || { label: norm, color: 'default' };
                if (editingUserId === record.username) {
                    return (
                        <Form form={editingUserForm} layout="inline">
                            <Form.Item name="role" style={{ marginBottom: 0 }}>
                                <Select size="small" style={{ width: 160 }}>
                                    {isSuperAdmin && <Select.Option value="super_admin">מנהל על</Select.Option>}
                                    <Select.Option value="synagogue_admin">מנהל בית כנסת</Select.Option>
                                    <Select.Option value="viewer">צופה</Select.Option>
                                </Select>
                            </Form.Item>
                        </Form>
                    );
                }
                return <Tag color={info.color}>{info.label}</Tag>;
            }
        },
        {
            title: 'בית כנסת',
            dataIndex: 'synagogueId',
            key: 'synagogueId',
            render: (synId, record) => {
                if (editingUserId === record.username) {
                    return (
                        <Form form={editingUserForm} layout="inline">
                            <Form.Item name="synagogueId" style={{ marginBottom: 0 }}>
                                <Select size="small" style={{ width: 180 }} allowClear placeholder="כללי (כל בתי כנסת)">
                                    {synagogues.map(s => (
                                        <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Form>
                    );
                }
                const syn = synagogues.find(s => s.id === synId);
                return syn
                    ? <Tag icon={<BankOutlined />} color="cyan">{syn.name}</Tag>
                    : <Text type="secondary">כללי</Text>;
            }
        },
        {
            title: 'פעולות',
            key: 'actions',
            align: 'center',
            render: (_, record) =>
                editingUserId === record.username ? (
                    <Space>
                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => saveUser(record.username)}>שמור</Button>
                        <Button size="small" icon={<CloseOutlined />} onClick={() => setEditingUserId(null)}>בטל</Button>
                    </Space>
                ) : (
                    <Space>
                        <Tooltip title="עריכת תפקיד ובית כנסת">
                            <Button size="small" icon={<EditOutlined />} onClick={() => startEditUser(record)} />
                        </Tooltip>
                        <Tooltip title="שינוי סיסמה">
                            <Button size="small" icon={<KeyOutlined />} onClick={() => changePassword(record.username)} />
                        </Tooltip>
                        {record.username !== 'admin' && (
                            <Popconfirm title="למחוק משתמש זה?" onConfirm={() => deleteUser(record.username)} okText="כן" cancelText="לא">
                                <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        )}
                    </Space>
                )
        }
    ];

    // ── Tab items ─────────────────────────────────────────────────────────────

    const tabs = [
        {
            key: 'synagogues',
            label: <span><BankOutlined /> בתי כנסת ({synagogues.length})</span>,
            children: (
                <div>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={5} style={{ margin: 0 }}>ניהול בתי כנסת</Title>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddSyn(v => !v)}>
                            הוסף בית כנסת
                        </Button>
                    </div>

                    {showAddSyn && (
                        <Card size="small" style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}>
                            <Form form={addSynForm} layout="inline" onFinish={handleAddSynagogue}>
                                <Form.Item name="name" label="שם" rules={[{ required: true, message: 'חובה' }]}>
                                    <Input placeholder="שם בית כנסת" prefix={<BankOutlined />} />
                                </Form.Item>
                                <Form.Item name="address" label="כתובת">
                                    <Input placeholder="כתובת" prefix={<EnvironmentOutlined />} />
                                </Form.Item>
                                <Form.Item name="phone" label="טלפון">
                                    <Input placeholder="טלפון" prefix={<PhoneOutlined />} />
                                </Form.Item>
                                <Form.Item>
                                    <Space>
                                        <Button type="primary" htmlType="submit" loading={savingSyn}>צור</Button>
                                        <Button onClick={() => { setShowAddSyn(false); addSynForm.resetFields(); }}>ביטול</Button>
                                    </Space>
                                </Form.Item>
                            </Form>
                        </Card>
                    )}

                    <Table
                        dataSource={synagogues}
                        columns={synColumns}
                        rowKey="id"
                        loading={loadingSyn}
                        size="small"
                        pagination={false}
                        locale={{ emptyText: 'אין בתי כנסת במערכת' }}
                    />
                </div>
            )
        },
        {
            key: 'users',
            label: <span><TeamOutlined /> משתמשים ({users.length})</span>,
            children: (
                <div>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={5} style={{ margin: 0 }}>ניהול משתמשים</Title>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddUser(v => !v)}>
                            הוסף משתמש
                        </Button>
                    </div>

                    {showAddUser && (
                        <Card size="small" style={{ marginBottom: 16, background: '#e6f7ff', borderColor: '#91d5ff' }}>
                            <Form form={addUserForm} layout="inline" onFinish={handleAddUser}>
                                <Form.Item name="username" label="שם משתמש" rules={[{ required: true, message: 'חובה' }]}>
                                    <Input placeholder="שם משתמש" prefix={<UserOutlined />} />
                                </Form.Item>
                                <Form.Item name="password" label="סיסמה" rules={[{ required: true, message: 'חובה' }, { min: 4, message: 'מינימום 4 תווים' }]}>
                                    <Input.Password placeholder="סיסמה" />
                                </Form.Item>
                                <Form.Item name="role" label="תפקיד" initialValue="synagogue_admin">
                                    <Select style={{ width: 160 }}>
                                        {isSuperAdmin && <Select.Option value="super_admin">מנהל על</Select.Option>}
                                        <Select.Option value="synagogue_admin">מנהל בית כנסת</Select.Option>
                                        <Select.Option value="viewer">צופה</Select.Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item name="synagogueId" label="בית כנסת">
                                    <Select style={{ width: 180 }} allowClear placeholder="כללי">
                                        {synagogues.map(s => (
                                            <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                                <Form.Item>
                                    <Space>
                                        <Button type="primary" htmlType="submit" loading={savingUser}>צור</Button>
                                        <Button onClick={() => { setShowAddUser(false); addUserForm.resetFields(); }}>ביטול</Button>
                                    </Space>
                                </Form.Item>
                            </Form>
                        </Card>
                    )}

                    <Table
                        dataSource={users}
                        columns={userColumns}
                        rowKey="username"
                        loading={loadingUsers}
                        size="small"
                        pagination={false}
                        locale={{ emptyText: 'אין משתמשים' }}
                    />
                </div>
            )
        },
        isSuperAdmin && {
            key: 'stats',
            label: <span><BarChartOutlined /> סטטיסטיקה</span>,
            children: (
                <div>
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col span={8}>
                            <Card>
                                <Statistic title="סה״כ בתי כנסת" value={synagogues.length} prefix={<BankOutlined />} valueStyle={{ color: '#1890ff' }} />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card>
                                <Statistic title="סה״כ מתפללים" value={members.length} prefix={<TeamOutlined />} valueStyle={{ color: '#52c41a' }} />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card>
                                <Statistic title="סה״כ משתמשים" value={users.length} prefix={<UserOutlined />} valueStyle={{ color: '#722ed1' }} />
                            </Card>
                        </Col>
                    </Row>

                    <Divider>פירוט לפי בית כנסת</Divider>
                    <Table
                        dataSource={synStats}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        columns={[
                            { title: 'בית כנסת', dataIndex: 'name', key: 'name', render: n => <strong>{n}</strong> },
                            { title: 'מתפללים', dataIndex: 'memberCount', key: 'memberCount', align: 'center', render: v => <Badge count={v} showZero color="#1890ff" /> },
                            { title: 'נפטרים', dataIndex: 'niftarCount', key: 'niftarCount', align: 'center', render: v => <Badge count={v} showZero color="#ff4d4f" /> },
                            { title: 'משתמשים', dataIndex: 'userCount', key: 'userCount', align: 'center', render: v => <Badge count={v} showZero color="#722ed1" /> },
                        ]}
                        locale={{ emptyText: 'אין נתונים' }}
                    />

                    <Divider>מתפללים ללא שיוך לבית כנסת</Divider>
                    <Statistic
                        value={members.filter(m => !m.synagogueId).length}
                        suffix="מתפללים"
                        valueStyle={{ color: '#faad14', fontSize: 20 }}
                    />
                </div>
            )
        }
    ].filter(Boolean);

    return (
        <Modal
            open={visible}
            title={
                <Space>
                    <CrownOutlined style={{ color: '#faad14', fontSize: 18 }} />
                    <span style={{ fontSize: 18, fontWeight: 700 }}>לוח בקרה - ניהול מערכת</span>
                </Space>
            }
            onCancel={onCancel}
            footer={null}
            width={900}
            destroyOnClose
            styles={{
                header: { background: 'linear-gradient(135deg, #001d6c 0%, #003a8c 100%)', color: '#fff', borderRadius: '8px 8px 0 0' },
                content: { borderRadius: 8 }
            }}
        >
            <Tabs
                defaultActiveKey="synagogues"
                items={tabs}
                tabBarStyle={{ marginBottom: 16 }}
                size="large"
            />
        </Modal>
    );
};

export default AdminDashboardModal;
