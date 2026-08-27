import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal, Tabs, Table, Button, Form, Input, Select, AutoComplete, Popconfirm, Space,
    message, Tag, Card, Statistic, Row, Col, Tooltip, Badge, Divider, Typography, Switch
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, KeyOutlined, EditOutlined, BankOutlined,
    TeamOutlined, BarChartOutlined, CheckOutlined, CloseOutlined, CrownOutlined,
    UserOutlined, EnvironmentOutlined, EyeOutlined, ReloadOutlined,
    MobileOutlined, GlobalOutlined, WindowsOutlined, AppleOutlined, SearchOutlined,
    LockOutlined, UnlockOutlined, UserAddOutlined
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
    const [guestLogs, setGuestLogs] = useState([]);
    const [loadingSyn, setLoadingSyn] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logSearchText, setLogSearchText] = useState('');
    const [logPlatformFilter, setLogPlatformFilter] = useState('all');

    // Israeli cities and streets data from OpenStreetMap with local caching
    const [cities, setCities] = useState([]);
    const [streets, setStreets] = useState([]);
    const [loadingCities, setLoadingCities] = useState(false);
    const [loadingStreets, setLoadingStreets] = useState(false);
    
    // Local in-memory cache: city -> Set of streets
    const [streetsCache, setStreetsCache] = useState(new Map());

    // Inline edit state for synagogue row
    const [editingSynId, setEditingSynId] = useState(null);
    const [editingSynForm] = Form.useForm();

    // Inline edit state for user row
    const [editingUserId, setEditingUserId] = useState(null);
    const [editingUserForm] = Form.useForm();

    const [addSynForm] = Form.useForm();
    const [addUserForm] = Form.useForm();
    const [mysynForm] = Form.useForm();
    const [showAddSyn, setShowAddSyn] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [savingSyn, setSavingSyn] = useState(false);
    const [savingUser, setSavingUser] = useState(false);
    const [savingMySyn, setSavingMySyn] = useState(false);
    const [selfRegConfig, setSelfRegConfig] = useState({ allowGuestSelfRegistration: true, guestSelfRegistrationExpiresAt: null });
    const [savingSelfReg, setSavingSelfReg] = useState(false);

    const isSuperAdmin = currentUser?.role === 'super_admin';

    const fetchSelfRegConfig = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/preferences`);
            if (res.ok) {
                const prefs = await res.json();
                setSelfRegConfig({
                    allowGuestSelfRegistration: prefs.allowGuestSelfRegistration !== false,
                    guestSelfRegistrationExpiresAt: prefs.guestSelfRegistrationExpiresAt || null,
                    synagogueSelfReg: prefs.synagogueSelfReg || {}
                });
            }
        } catch (e) {}
    };

    const saveSelfRegConfig = async (newConfig) => {
        setSavingSelfReg(true);
        try {
            const res = await fetch(`${API_BASE}/api/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newConfig)
            });
            const data = await res.json();
            if (data.success) {
                setSelfRegConfig(data.preferences || newConfig);
                message.success('הגדרות הרשמה עצמית עודכנו בהצלחה');
            }
        } catch (e) {
            console.error('Failed to save self-reg preferences:', e);
            message.error('שגיאה בשמירת הגדרות הרשמה עצמית');
        } finally {
            setSavingSelfReg(false);
        }
    };

    const handleToggleSelfReg = (checked) => {
        const newConfig = {
            ...selfRegConfig,
            allowGuestSelfRegistration: checked,
            guestSelfRegistrationExpiresAt: checked ? selfRegConfig.guestSelfRegistrationExpiresAt : null
        };
        saveSelfRegConfig(newConfig);
    };

    const handleToggleSynagogueSelfReg = (synId, checked) => {
        const currentMap = selfRegConfig.synagogueSelfReg || {};
        const updatedMap = { ...currentMap, [synId]: checked };
        const newConfig = {
            ...selfRegConfig,
            synagogueSelfReg: updatedMap
        };
        saveSelfRegConfig(newConfig);
    };

    const handleLockSelfRegNow = () => {
        const newConfig = {
            ...selfRegConfig,
            allowGuestSelfRegistration: false,
            guestSelfRegistrationExpiresAt: new Date().toISOString()
        };
        saveSelfRegConfig(newConfig);
        message.success('ההרשמה העצמית נחסמה וננעלה בהצלחה');
    };

    const handleSetSelfRegTimeout = (val) => {
        let expiresAt = null;
        const now = new Date();
        if (val === '15m') expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
        else if (val === '1h') expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        else if (val === '24h') expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        else if (val === '48h') expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
        else if (val === '7d') expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const newConfig = {
            ...selfRegConfig,
            allowGuestSelfRegistration: true,
            guestSelfRegistrationExpiresAt: expiresAt
        };
        saveSelfRegConfig(newConfig);
    };

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    // Load Israeli cities from backend API
    const loadCities = async () => {
        setLoadingCities(true);
        try {
            const response = await fetch(`${API_BASE}/api/osm/cities`, { headers });
            const data = await response.json();
            if (data.cities && Array.isArray(data.cities)) {
                setCities(data.cities);
            }
        } catch (error) {
            console.error('Failed to load cities from backend API:', error);
            // Fallback to some common cities
            setCities(['ירושלים', 'תל אביב-יפו', 'חיפה', 'ראשון לציון', 'אשדוד', 'באר שבע', 'נתניה', 'חולון', 'בני ברק', 'רמת גן']);
        } finally {
            setLoadingCities(false);
        }
    };

    // Load streets for selected city from backend API
    const loadStreets = async (cityName) => {
        if (!cityName) {
            setStreets([]);
            return;
        }
        
        // Check cache first
        if (streetsCache.has(cityName)) {
            const cachedStreets = Array.from(streetsCache.get(cityName)).sort((a, b) => a.localeCompare(b, 'he'));
            setStreets(cachedStreets);
            return;
        }
        
        setLoadingStreets(true);
        try {
            const response = await fetch(`${API_BASE}/api/osm/streets?city=${encodeURIComponent(cityName)}`, { headers });
            const data = await response.json();
            if (data.streets && Array.isArray(data.streets)) {
                setStreets(data.streets);
                
                // Cache the streets for this city
                setStreetsCache(prev => new Map(prev).set(cityName, new Set(data.streets)));
            }
        } catch (error) {
            console.error('Failed to load streets from backend API:', error);
            setStreets([]);
        } finally {
            setLoadingStreets(false);
        }
    };

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

    const fetchGuestLogs = async () => {
        if (!isSuperAdmin) return;
        setLoadingLogs(true);
        try {
            const res = await fetch(`${API_BASE}/api/logs/guest?limit=1000`, { headers });
            if (!res.ok) throw new Error();
            setGuestLogs(await res.json());
        } catch {
            message.error('שגיאה בטעינת יומן כניסות');
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleClearGuestLogs = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/logs/guest`, { method: 'DELETE', headers });
            if (!res.ok) throw new Error();
            message.success('יומן הכניסות נוקה בהצלחה');
            setGuestLogs([]);
        } catch {
            message.error('שגיאה בניקוי יומן כניסות');
        }
    };

    useEffect(() => {
        if (visible) {
            fetchSelfRegConfig();
            if (token) {
                fetchSynagogues();
                fetchUsers();
                if (isSuperAdmin) {
                    fetchGuestLogs();
                }
            }
        }
    }, [visible, token, isSuperAdmin]);

    // Load cities only when the add synagogue modal is opened
    useEffect(() => {
        if (showAddSyn) {
            loadCities();
        }
    }, [showAddSyn]);

    // ── Synagogue actions ─────────────────────────────────────────────────────

    const handleAddSynagogue = async (values) => {
        setSavingSyn(true);
        try {
            // First create the synagogue
            const res = await fetch(`${API_BASE}/api/synagogues`, {
                method: 'POST', headers, body: JSON.stringify(values)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'שגיאה');

            // If admin details provided, create the admin user
            if (values.adminUsername && values.adminPassword) {
                const adminRes = await fetch(`${API_BASE}/api/users`, {
                    method: 'POST', headers, body: JSON.stringify({
                        username: values.adminUsername,
                        password: values.adminPassword,
                        name: values.adminName || values.adminUsername,
                        role: 'synagogue_admin',
                        synagogueId: data.id
                    })
                });
                const adminData = await adminRes.json();
                if (!adminRes.ok) {
                    message.warning('בית כנסת נוצר אבל נכשל יצירת מנהל: ' + (adminData.error || 'שגיאה'));
                } else {
                    message.success('בית כנסת ומנהל נוצרו בהצלחה');
                }
            } else {
                message.success('בית כנסת נוצר בהצלחה');
            }

            fetchSynagogues();
            fetchUsers();
            addSynForm.resetFields();
            setShowAddSyn(false);
        } catch (e) {
            console.error('Error creating synagogue:', e);
            message.error(e.message);
        }
        finally { setSavingSyn(false); }
    };

    const startEditSyn = (record) => {
        setEditingSynId(record.id);
        editingSynForm.setFieldsValue({
            name: record.name || '',
            city: record.city || '',
            street: record.street || '',
            houseNumber: record.houseNumber || ''
        });
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

    // ── Synagogue admin – update own synagogue name ───────────────────────────

    const saveMySynName = async () => {
        setSavingMySyn(true);
        try {
            const values = await mysynForm.validateFields();
            const synId = currentUser?.synagogueId;
            if (!synId) { message.error('לא שויכת לבית כנסת'); return; }
            const res = await fetch(`${API_BASE}/api/synagogues/${synId}`, {
                method: 'PUT', headers, body: JSON.stringify({ name: values.name })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'שגיאה');
            message.success('שם בית הכנסת עודכן בהצלחה');
            fetchSynagogues();
        } catch (e) { if (e.message) message.error(e.message); }
        finally { setSavingMySyn(false); }
    };

    // ── User actions ──────────────────────────────────────────────────────────

    const handleAddUser = async (values) => {
        setSavingUser(true);
        try {
            // For synagogue admin, enforce their synagogueId
            const payload = { ...values };
            if (!isSuperAdmin && currentUser?.synagogueId) {
                payload.synagogueId = currentUser.synagogueId;
            }
            
            const res = await fetch(`${API_BASE}/api/users`, {
                method: 'POST', headers, body: JSON.stringify(payload)
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
        // Prevent synagogue admin from editing users from other synagogues
        if (!isSuperAdmin && currentUser?.synagogueId && record.synagogueId !== currentUser.synagogueId) {
            message.error('אין לך הרשאה לערוך משתמשים מבתי כנסת אחרים');
            return;
        }
        
        setEditingUserId(record.username);
        editingUserForm.setFieldsValue({
            role: normalizeRole(record.role),
            synagogueId: record.synagogueId || undefined
        });
    };

    const saveUser = async (username) => {
        try {
            const values = await editingUserForm.validateFields();
            
            // For synagogue admin, enforce their synagogueId and prevent changing it
            const payload = { ...values };
            if (!isSuperAdmin && currentUser?.synagogueId) {
                payload.synagogueId = currentUser.synagogueId;
            }
            
            const res = await fetch(`${API_BASE}/api/users/${username}`, {
                method: 'PUT', headers, body: JSON.stringify(payload)
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
            render: (name, record) => (
                editingSynId === record.id ? (
                    <div>
                        <Form form={editingSynForm} layout="vertical" style={{ margin: 0 }}>
                            <Form.Item name="name" style={{ marginBottom: 4 }}>
                                <Input size="small" placeholder="שם בית כנסת" />
                            </Form.Item>
                        </Form>
                    </div>
                ) : (
                    <Space><BankOutlined style={{ color: '#1890ff' }} /><strong>{name}</strong></Space>
                )
            )
        },
        {
            title: 'כתובת',
            dataIndex: 'address',
            key: 'address',
            render: (addr, record) =>
                editingSynId === record.id ? (
                    <div>
                        <Form form={editingSynForm} layout="vertical" style={{ margin: 0 }}>
                            <Space size={4}>
                                <Form.Item name="city" style={{ marginBottom: 4 }}>
                                    <Input size="small" style={{ width: 100 }} placeholder="עיר" />
                                </Form.Item>
                                <Form.Item name="street" style={{ marginBottom: 4 }}>
                                    <Input size="small" style={{ width: 100 }} placeholder="רחוב" />
                                </Form.Item>
                                <Form.Item name="houseNumber" style={{ marginBottom: 4 }}>
                                    <Input size="small" style={{ width: 70 }} placeholder="מס'" />
                                </Form.Item>
                            </Space>
                        </Form>
                    </div>
                ) : (
                    <Space direction="vertical" size={0}>
                        {record.city && <Text type="secondary">{record.city}</Text>}
                        {record.street && <Text>{record.street} {record.houseNumber}</Text>}
                        {!record.city && !record.street && <Text type="secondary">—</Text>}
                    </Space>
                )
        },
        {
            title: 'מתפללים',
            key: 'memberCount',
            align: 'center',
            render: (_, record) => {
                const s = synStats.find(x => x.id === record.id);
                return <Badge count={s?.memberCount || 0} overflowCount={99999} showZero color="#1890ff" />;
            }
        },
        {
            title: 'הרשמה עצמית',
            key: 'selfReg',
            align: 'center',
            render: (_, record) => {
                const isSynOpen = selfRegConfig.synagogueSelfReg && selfRegConfig.synagogueSelfReg[record.id] !== undefined
                    ? selfRegConfig.synagogueSelfReg[record.id]
                    : true;
                const isGlobalActive = selfRegConfig.allowGuestSelfRegistration !== false && (!selfRegConfig.guestSelfRegistrationExpiresAt || new Date(selfRegConfig.guestSelfRegistrationExpiresAt) > new Date());
                
                return (
                    <Tooltip title={isGlobalActive ? (isSynOpen ? 'פתוח להרשמה עצמית' : 'חסום להרשמה עצמית בבית כנסת זה') : 'חסום גלובלית במערכת'}>
                        <Switch
                            size="small"
                            disabled={!isGlobalActive}
                            checked={isGlobalActive && isSynOpen}
                            checkedChildren="פתוח"
                            unCheckedChildren="סגור"
                            onChange={(checked) => handleToggleSynagogueSelfReg(record.id, checked)}
                        />
                    </Tooltip>
                );
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
        isSuperAdmin && {
            title: 'בית כנסת',
            dataIndex: 'synagogueId',
            key: 'synagogueId',
            render: (synId, record) => {
                if (editingUserId === record.username) {
                    return (
                        <Form form={editingUserForm} layout="inline">
                            <Form.Item name="synagogueId" style={{ marginBottom: 0 }}>
                                <Select 
                                    size="small" 
                                    style={{ width: 180 }} 
                                    allowClear 
                                    placeholder="כללי (כל בתי כנסת)"
                                    disabled={!isSuperAdmin}
                                >
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
                        <Tooltip title="עריכת תפקיד">
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
    ].filter(Boolean);

    // ── Tab items ─────────────────────────────────────────────────────────────

    // Determine the synagogue of the current synagogue_admin
    const mySynagogue = !isSuperAdmin && currentUser?.synagogueId
        ? synagogues.find(s => s.id === currentUser.synagogueId)
        : null;

    // Initialise mysynForm whenever the synagogue data is loaded
    useEffect(() => {
        if (mySynagogue) {
            mysynForm.setFieldsValue({ name: mySynagogue.name || '' });
        }
    }, [mySynagogue?.name]);

    const filteredGuestLogs = useMemo(() => {
        return guestLogs.filter(log => {
            if (logPlatformFilter !== 'all' && log.platform !== logPlatformFilter) {
                return false;
            }
            if (!logSearchText.trim()) return true;
            const q = logSearchText.trim().toLowerCase();
            const synName = log.synagogueName || synagogues.find(s => s.id === log.synagogueId)?.name || '';
            return (
                (log.username || '').toLowerCase().includes(q) ||
                (log.ip || '').toLowerCase().includes(q) ||
                (log.hebrewDate || '').toLowerCase().includes(q) ||
                synName.toLowerCase().includes(q) ||
                (log.userAgent || '').toLowerCase().includes(q)
            );
        });
    }, [guestLogs, logSearchText, logPlatformFilter, synagogues]);

    const logColumns = [
        {
            title: 'זמן',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 150,
            render: (t) => {
                if (!t) return '-';
                try {
                    const d = new Date(t);
                    if (isNaN(d.getTime())) return t;
                    const pad = (n) => String(n).padStart(2, '0');
                    const day = pad(d.getDate());
                    const month = pad(d.getMonth() + 1);
                    const year = d.getFullYear();
                    const hours = pad(d.getHours());
                    const minutes = pad(d.getMinutes());
                    return `${day}/${month}/${year} ${hours}:${minutes}`;
                } catch {
                    return t;
                }
            }
        },
        {
            title: 'מכשיר / פלטפורמה',
            dataIndex: 'platform',
            key: 'platform',
            width: 130,
            render: (p) => {
                switch (p) {
                    case 'android':
                        return <Tag color="green" icon={<MobileOutlined />}>Android</Tag>;
                    case 'ios':
                        return <Tag color="cyan" icon={<AppleOutlined />}>iOS</Tag>;
                    case 'electron':
                        return <Tag color="blue" icon={<WindowsOutlined />}>Windows App</Tag>;
                    case 'web':
                    default:
                        return <Tag color="purple" icon={<GlobalOutlined />}>Web</Tag>;
                }
            }
        },
        {
            title: 'משתמש / מעמד',
            key: 'userRole',
            width: 150,
            render: (_, r) => {
                if (r.userRole === 'super_admin') return <Tag color="gold">מנהל על ({r.username})</Tag>;
                if (r.userRole === 'synagogue_admin') return <Tag color="blue">מנהל ({r.username})</Tag>;
                return <Tag color="default">אורח ({r.username || 'צפייה'})</Tag>;
            }
        },
        {
            title: 'בית כנסת',
            key: 'synagogue',
            width: 180,
            render: (_, r) => {
                const synName = r.synagogueName || synagogues.find(s => s.id === r.synagogueId)?.name;
                return synName ? <Tag color="geekblue">{synName}</Tag> : <Text type="secondary">כללי / לא נבחר</Text>;
            }
        },
        {
            title: 'כתובת IP',
            dataIndex: 'ip',
            key: 'ip',
            width: 220,
            render: (ip) => (
                <Text code style={{ whiteSpace: 'nowrap', display: 'inline-block', direction: 'ltr' }}>
                    {ip || '-'}
                </Text>
            )
        }
    ];

    const tabs = [
        isSuperAdmin && {
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
                            <Form form={addSynForm} layout="vertical" onFinish={handleAddSynagogue}>
                                <Row gutter={16}>
                                    <Col span={24}>
                                        <Form.Item name="name" label="שם בית כנסת" rules={[{ required: true, message: 'חובה' }]}>
                                            <Input placeholder="שם בית כנסת" prefix={<BankOutlined />} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item name="city" label="עיר" rules={[{ required: true, message: 'חובה' }]}>
                                            <Select
                                                placeholder={loadingCities ? "טוען ערים..." : "בחר עיר"}
                                                showSearch
                                                loading={loadingCities}
                                                filterOption={(input, option) =>
                                                    option?.label?.toLowerCase().includes(input.toLowerCase())
                                                }
                                                onChange={(value) => {
                                                    loadStreets(value);
                                                    addSynForm.setFieldsValue({ street: undefined });
                                                }}
                                                options={cities.map(city => ({ value: city, label: city }))}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="street" label="רחוב">
                                            <AutoComplete
                                                placeholder={loadingStreets ? "טוען רחובות..." : "הזן או בחר רחוב"}
                                                disabled={!addSynForm.getFieldValue('city')}
                                                options={streets.map(street => ({ value: street, label: street }))}
                                                filterOption={(inputValue, option) =>
                                                    option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                                }
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="houseNumber" label="מספר בית">
                                            <Input placeholder="מספר" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Divider>יצירת מנהל בית כנסת</Divider>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item name="adminUsername" label="שם משתמש מנהל">
                                            <Input placeholder="שם משתמש" prefix={<UserOutlined />} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="adminPassword" label="סיסמה מנהל">
                                            <Input.Password placeholder="סיסמה" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="adminName" label="שם מלא מנהל">
                                            <Input placeholder="שם מלא" />
                                        </Form.Item>
                                    </Col>
                                </Row>
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
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `סה"כ: ${total} בתי כנסת`,
                            pageSizeOptions: ['10', '20', '50', '100']
                        }}
                        locale={{ emptyText: 'אין בתי כנסת במערכת' }}
                        scroll={{ y: 400 }}
                    />
                </div>
            )
        },
        {
            key: 'users',
            label: <span><TeamOutlined /> {isSuperAdmin ? `משתמשים (${users.length})` : `מנהלים ומשתמשים (${users.length})`}</span>,
            children: (
                <div>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={5} style={{ margin: 0 }}>{isSuperAdmin ? 'ניהול משתמשים' : 'ניהול מנהלים ומשתמשים'}</Title>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddUser(v => !v)}>
                            {isSuperAdmin ? 'הוסף משתמש' : 'הוסף מנהל חדש'}
                        </Button>
                    </div>

                    {showAddUser && (
                        <Card size="small" style={{ marginBottom: 16, background: '#e6f7ff', borderColor: '#91d5ff' }}>
                            <Form 
                                form={addUserForm} 
                                layout="inline" 
                                onFinish={handleAddUser}
                                initialValues={{
                                    role: 'synagogue_admin',
                                    synagogueId: !isSuperAdmin ? currentUser?.synagogueId : undefined
                                }}
                            >
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
                                {isSuperAdmin && (
                                    <Form.Item name="synagogueId" label="בית כנסת">
                                        <Select 
                                            style={{ width: 180 }} 
                                            allowClear 
                                            placeholder="כללי"
                                        >
                                            {synagogues.map(s => (
                                                 <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                )}
                                <Form.Item>
                                    <Space>
                                        <Button type="primary" htmlType="submit" loading={savingUser}>צור מנהל/משתמש</Button>
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
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `סה"כ: ${total} משתמשים`,
                            pageSizeOptions: ['10', '20', '50', '100']
                        }}
                        locale={{ emptyText: 'אין משתמשים' }}
                        scroll={{ y: 400 }}
                    />
                </div>
            )
        },
        isSuperAdmin && {
            key: 'guest_logs',
            label: <span><EyeOutlined /> יומן כניסות אורחים ({guestLogs.length})</span>,
            children: (
                <div>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <Title level={5} style={{ margin: 0 }}>יומן פתיחת אפליקציה וכניסות אורחים</Title>
                        <Space wrap>
                            <Input
                                placeholder="חיפוש לפי בית כנסת / IP / משתמש..."
                                prefix={<SearchOutlined />}
                                value={logSearchText}
                                onChange={(e) => setLogSearchText(e.target.value)}
                                style={{ width: 230 }}
                                allowClear
                            />
                            <Select
                                value={logPlatformFilter}
                                onChange={setLogPlatformFilter}
                                style={{ width: 130 }}
                            >
                                <Select.Option value="all">כל המכשירים</Select.Option>
                                <Select.Option value="android">Android 📱</Select.Option>
                                <Select.Option value="ios">iOS 🍏</Select.Option>
                                <Select.Option value="web">Web 🌐</Select.Option>
                                <Select.Option value="electron">Windows 💻</Select.Option>
                            </Select>
                            <Button icon={<ReloadOutlined />} onClick={fetchGuestLogs} loading={loadingLogs}>
                                רענן
                            </Button>
                            <Popconfirm
                                title="האם אתה בטוח שברצונך למחוק את כל יומן הכניסות?"
                                onConfirm={handleClearGuestLogs}
                                okText="כן, נקה"
                                cancelText="ביטול"
                            >
                                <Button danger icon={<DeleteOutlined />}>
                                    נקה יומן
                                </Button>
                            </Popconfirm>
                        </Space>
                    </div>

                    <Table
                        dataSource={filteredGuestLogs}
                        columns={logColumns}
                        rowKey="id"
                        loading={loadingLogs}
                        size="small"
                        pagination={{
                            pageSize: 15,
                            showSizeChanger: true,
                            showTotal: (total) => `סה"כ: ${total} רשומות כניסה`,
                            pageSizeOptions: ['15', '30', '50', '100']
                        }}
                        locale={{ emptyText: 'אין רשומות כניסה עדיין' }}
                        scroll={{ x: 'max-content', y: 400 }}
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
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `סה"כ: ${total} בתי כנסת`,
                            pageSizeOptions: ['10', '20', '50', '100']
                        }}
                        scroll={{ y: 300 }}
                        columns={[
                            { title: 'בית כנסת', dataIndex: 'name', key: 'name', render: n => <strong>{n}</strong> },
                            { title: 'מתפללים', dataIndex: 'memberCount', key: 'memberCount', align: 'center', render: v => <Badge count={v} showZero color="#1890ff" /> },
                            { title: 'נפטרים', dataIndex: 'niftarCount', key: 'niftarCount', align: 'center', render: v => <Badge count={v} showZero color="#ff4d4f" /> },
                            { title: 'משתמשים', dataIndex: 'userCount', key: 'userCount', align: 'center', render: v => <Badge count={v} showZero color="#722ed1" /> },
                            {
                                title: 'הרשמה עצמית',
                                key: 'selfReg',
                                align: 'center',
                                render: (_, r) => {
                                    const isSynOpen = selfRegConfig.synagogueSelfReg && selfRegConfig.synagogueSelfReg[r.id] !== undefined
                                        ? selfRegConfig.synagogueSelfReg[r.id]
                                        : true;
                                    const isGlobalActive = selfRegConfig.allowGuestSelfRegistration !== false && (!selfRegConfig.guestSelfRegistrationExpiresAt || new Date(selfRegConfig.guestSelfRegistrationExpiresAt) > new Date());

                                    return (
                                        <Tooltip title={isGlobalActive ? (isSynOpen ? 'פתוח להרשמה עצמית' : 'חסום להרשמה עצמית בבית כנסת זה') : 'חסום גלובלית במערכת'}>
                                            <Switch
                                                size="small"
                                                disabled={!isGlobalActive}
                                                checked={isGlobalActive && isSynOpen}
                                                checkedChildren="פתוח"
                                                unCheckedChildren="סגור"
                                                onChange={(checked) => handleToggleSynagogueSelfReg(r.id, checked)}
                                            />
                                        </Tooltip>
                                    );
                                }
                            }
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
        },
        !isSuperAdmin && currentUser?.synagogueId && {
            key: 'mysyn',
            label: <span><BankOutlined /> הגדרות בית כנסת</span>,
            children: (
                <div>
                    <Title level={5} style={{ marginBottom: 20 }}>עדכון שם בית הכנסת</Title>
                    {mySynagogue ? (
                        <Card size="small" style={{ maxWidth: 480, background: '#f6ffed', borderColor: '#b7eb8f' }}>
                            <Form form={mysynForm} layout="vertical" onFinish={saveMySynName}>
                                <Form.Item
                                    name="name"
                                    label="שם בית כנסת"
                                    rules={[{ required: true, message: 'חובה להזין שם' }]}
                                >
                                    <Input
                                        prefix={<BankOutlined />}
                                        placeholder="הזן שם בית כנסת"
                                        size="large"
                                    />
                                </Form.Item>
                                <Form.Item style={{ marginBottom: 0 }}>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        icon={<CheckOutlined />}
                                        loading={savingMySyn}
                                    >
                                        שמור שינויים
                                    </Button>
                                </Form.Item>
                            </Form>
                        </Card>
                    ) : (
                        <Text type="secondary">לא שויכת לבית כנסת</Text>
                    )}
                </div>
            )
        },
        isSuperAdmin && {
            key: 'selfRegistration',
            label: (
                <Space>
                    <UserAddOutlined style={{ color: '#52c41a' }} />
                    <span>הגדרות הרשמה עצמית</span>
                </Space>
            ),
            children: (
                <div style={{ padding: '8px 0' }}>
                    <Card
                        title={
                            <Space>
                                <UserAddOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                                <span style={{ fontSize: 17, fontWeight: 700 }}>ניהול הרשמה עצמית לאורחים</span>
                            </Space>
                        }
                        style={{ borderRadius: 10, border: '1px solid #d9d9d9' }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                            <div style={{
                                background: (selfRegConfig.allowGuestSelfRegistration && (!selfRegConfig.guestSelfRegistrationExpiresAt || new Date(selfRegConfig.guestSelfRegistrationExpiresAt) > new Date())) ? '#f6ffed' : '#fff1f0',
                                border: `1px solid ${(selfRegConfig.allowGuestSelfRegistration && (!selfRegConfig.guestSelfRegistrationExpiresAt || new Date(selfRegConfig.guestSelfRegistrationExpiresAt) > new Date())) ? '#b7eb8f' : '#ffa39e'}`,
                                padding: '16px 20px',
                                borderRadius: 10
                            }}>
                                <Row align="middle" justify="space-between">
                                    <Col>
                                        <Space size="middle">
                                            {(selfRegConfig.allowGuestSelfRegistration && (!selfRegConfig.guestSelfRegistrationExpiresAt || new Date(selfRegConfig.guestSelfRegistrationExpiresAt) > new Date())) ? (
                                                <UnlockOutlined style={{ color: '#52c41a', fontSize: 28 }} />
                                            ) : (
                                                <LockOutlined style={{ color: '#ff4d4f', fontSize: 28 }} />
                                            )}
                                            <div>
                                                <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                                                    סטטוס הרשמה עצמית: {(selfRegConfig.allowGuestSelfRegistration && (!selfRegConfig.guestSelfRegistrationExpiresAt || new Date(selfRegConfig.guestSelfRegistrationExpiresAt) > new Date())) ? (
                                                        <Tag color="success" style={{ fontSize: 14, padding: '2px 10px' }}>פתוחה לאורחים</Tag>
                                                    ) : (
                                                        <Tag color="error" style={{ fontSize: 14, padding: '2px 10px' }}>נעולה / חסומה</Tag>
                                                    )}
                                                </div>
                                                {selfRegConfig.guestSelfRegistrationExpiresAt && new Date(selfRegConfig.guestSelfRegistrationExpiresAt) > new Date() ? (
                                                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
                                                        ⏰ פתוחה עד תאריך: <b>{new Date(selfRegConfig.guestSelfRegistrationExpiresAt).toLocaleString('he-IL')}</b> (תינעל אוטומטית)
                                                    </Text>
                                                ) : (
                                                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
                                                        אורחים שיבחרו בית כנסת יוכלו להוסיף את עצמם כמתפללים באופן חד-פעמי
                                                    </Text>
                                                )}
                                            </div>
                                        </Space>
                                    </Col>
                                    <Col>
                                        <Switch
                                            checked={selfRegConfig.allowGuestSelfRegistration && (!selfRegConfig.guestSelfRegistrationExpiresAt || new Date(selfRegConfig.guestSelfRegistrationExpiresAt) > new Date())}
                                            checkedChildren="פתוח"
                                            unCheckedChildren="חסום"
                                            loading={savingSelfReg}
                                            onChange={handleToggleSelfReg}
                                        />
                                    </Col>
                                </Row>
                            </div>

                            <Divider style={{ margin: '8px 0' }}>קביעת זמן נעילה אוטומטי</Divider>

                            <Row gutter={[16, 16]} align="middle">
                                <Col span={24}>
                                    <Form.Item label="נעילה אוטומטית לאחר פרק זמן" style={{ marginBottom: 0 }}>
                                        <Select
                                            placeholder="בחר זמן נעילה..."
                                            style={{ width: '100%' }}
                                            onChange={handleSetSelfRegTimeout}
                                            value={!selfRegConfig.guestSelfRegistrationExpiresAt ? 'unlimited' : undefined}
                                        >
                                            <Option value="unlimited">ללא הגבלת זמן (פתוח תמיד)</Option>
                                            <Option value="15m">נעל אוטומטית בעוד 15 דקות</Option>
                                            <Option value="1h">נעל אוטומטית בעוד שעה אחת</Option>
                                            <Option value="24h">נעל אוטומטית בעוד 24 שעות</Option>
                                            <Option value="48h">נעל אוטומטית בעוד 48 שעות</Option>
                                            <Option value="7d">נעל אוטומטית בעוד 7 ימים</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Space>
                    </Card>
                </div>
            )
        }
    ].filter(Boolean);

    return (
        <Modal
            open={visible}
            title={
                <Space>
                    {isSuperAdmin ? <CrownOutlined style={{ color: '#faad14', fontSize: 18 }} /> : <TeamOutlined style={{ color: '#1890ff', fontSize: 18 }} />}
                    <span style={{ fontSize: 18, fontWeight: 700 }}>
                        {isSuperAdmin ? 'לוח בקרה - ניהול מערכת' : 'ניהול מנהלים ומשתמשים'}
                    </span>
                </Space>
            }
            onCancel={onCancel}
            footer={null}
            width={1050}
            destroyOnClose
            styles={{
                header: { background: 'linear-gradient(135deg, #001d6c 0%, #003a8c 100%)', color: '#fff', borderRadius: '8px 8px 0 0', padding: '12px 20px' },
                content: { borderRadius: 8, padding: '16px 20px' },
                body: { padding: '10px 4px' }
            }}
        >
            <Tabs
                defaultActiveKey={isSuperAdmin ? 'synagogues' : 'users'}
                items={tabs}
                tabBarStyle={{ marginBottom: 10 }}
                size="middle"
            />
        </Modal>
    );
};

export default AdminDashboardModal;
