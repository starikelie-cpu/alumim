import React, { useState, useEffect, useCallback } from 'react';
import { getParashaForDate } from './utils/hebrewDateUtils';
import { Button, ConfigProvider, theme, message, Modal, Input, Form, Select, Tooltip, Tag, Popconfirm } from 'antd';
import { DownloadOutlined, UploadOutlined, PoweroffOutlined, WhatsAppOutlined, PhoneOutlined, UserAddOutlined, SafetyOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import heIL from 'antd/locale/he_IL';
import AddMemberModal from './components/AddMemberModal';
import GuestSelfRegisterModal from './components/GuestSelfRegisterModal';
import pkg from '../package.json';
import { loadJsonFile, saveJsonFile } from './utils/fileUtils';
import MembersListModal from './components/MembersListModal';
import ArchiveListModal from './components/ArchiveListModal';
import AddNiftarModal from './components/AddNiftarModal';
import NiftarimListModal from './components/NiftarimListModal';
import LoginModal from './components/LoginModal';
import AdminDashboardModal from './components/AdminDashboardModal';
import { API_BASE, isMobile, isElectron, getPlatform } from './config';

function App() {
    const [members, setMembers] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isListVisible, setIsListVisible] = useState(false);
    const [isArchiveVisible, setIsArchiveVisible] = useState(false);
    const [selectedMemberForArchive, setSelectedMemberForArchive] = useState(null);
    const [editingMember, setEditingMember] = useState(null);
    const [editingArchiveRecord, setEditingArchiveRecord] = useState(null);
    const [archiveRefreshKey, setArchiveRefreshKey] = useState(0);
    const [selfRegRefreshKey, setSelfRegRefreshKey] = useState(0);

    // Niftarim state
    const [niftarim, setNiftarim] = useState([]);
    const [isNiftarimListVisible, setIsNiftarimListVisible] = useState(false);
    const [isNiftarModalVisible, setIsNiftarModalVisible] = useState(false);
    const [editingNiftar, setEditingNiftar] = useState(null);

    // Authentication and User Roles state
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [user, setUser] = useState(null);
    const [isLoginVisible, setIsLoginVisible] = useState(false);
    const [isUserMgmtVisible, setIsUserMgmtVisible] = useState(false);
    const [synagogues, setSynagogues] = useState([]);
    const [isUsingCachedSynagogues, setIsUsingCachedSynagogues] = useState(false);
    const [localSynagogueName, setLocalSynagogueName] = useState(() => {
        // Load synagogue name from localStorage IMMEDIATELY - no server wait
        try {
            const saved = localStorage.getItem('localSynagogueName');
            if (saved) {
                // תיקון פורמט ישן: גרסאות ישנות שמרו "שם - כתובת" במקום רק שם
                // אם הערך מכיל " - " נחלץ רק את החלק לפני המקף
                if (saved.includes(' - ')) {
                    const namePart = saved.split(' - ')[0].trim();
                    console.log('Fixed old localSynagogueName format:', saved, '->', namePart);
                    localStorage.setItem('localSynagogueName', namePart);
                    return namePart;
                }
                console.log('Loaded synagogue name from localStorage immediately:', saved);
                return saved;
            }
        } catch (e) {
            console.error('Failed to load synagogue name from localStorage:', e);
        }
        return null;
    });
    // Guest synagogue selection – persisted in localStorage for instant load
    const [guestSynagogueId, setGuestSynagogueId] = useState(() => {
        // Load guest synagogue ID from localStorage IMMEDIATELY - no server wait
        try {
            const saved = localStorage.getItem('guestSynagogueId');
            if (saved) {
                console.log('Loaded guest synagogue ID from localStorage immediately:', saved);
                return saved;
            }
        } catch (e) {
            console.error('Failed to load guest synagogue ID from localStorage:', e);
        }
        return null;
    });
    const [adminViewSynagogueId, setAdminViewSynagogueId] = useState(
        () => localStorage.getItem('adminViewSynagogueId') || null
    );
    const [showFirstTimePrompt, setShowFirstTimePrompt] = useState(false);

    // Database connection status state
    const [dbStatus, setDbStatus] = useState({ useMongoDB: false, error: null, mongoUri: 'mongodb+srv://Alumim:alumim99@cluster1.i8jyvvd.mongodb.net/Alumim?retryWrites=true&w=majority&appName=Cluster1' });
    const [isDbStatusModalVisible, setIsDbStatusModalVisible] = useState(false);
    const [customUriInput, setCustomUriInput] = useState('');
    const [isConnectingDb, setIsConnectingDb] = useState(false);
    const [isAdminCredentialsVisible, setIsAdminCredentialsVisible] = useState(false);
    const [isSavingAdminCredentials, setIsSavingAdminCredentials] = useState(false);
    const [adminCredentialsForm] = Form.useForm();

    // Guest self-registration modal state
    const [isGuestSelfRegModalVisible, setIsGuestSelfRegModalVisible] = useState(false);
    const [selfRegConfig, setSelfRegConfig] = useState({ allowGuestSelfRegistration: true, guestSelfRegistrationExpiresAt: null, synagogueSelfReg: {} });

    // App loading state for splash screen
    const [isAppLoading, setIsAppLoading] = useState(true);

    const loadPreferences = useCallback(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(`${API_BASE}/api/preferences`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const prefs = await res.json();
                if (prefs.cachedSynagogues && Array.isArray(prefs.cachedSynagogues)) {
                    setSynagogues(prefs.cachedSynagogues);
                    setIsUsingCachedSynagogues(true);
                }
                setSelfRegConfig({
                    allowGuestSelfRegistration: prefs.allowGuestSelfRegistration !== false,
                    guestSelfRegistrationExpiresAt: prefs.guestSelfRegistrationExpiresAt || null,
                    synagogueSelfReg: prefs.synagogueSelfReg || {}
                });
                if (prefs.guestResetVersion) {
                    const lastProcessed = localStorage.getItem('last_processed_guest_reset_version');
                    if (!lastProcessed || Number(prefs.guestResetVersion) > Number(lastProcessed)) {
                        localStorage.removeItem('guest_reset_count');
                        localStorage.setItem('last_processed_guest_reset_version', String(prefs.guestResetVersion));
                        console.log('Guest reset limit cleared by admin reset');
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load preferences:', e);
        }
    }, []);

    const getHeaders = (extraHeaders = {}) => {
        const headers = { ...extraHeaders };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    };

    useEffect(() => {
        // Guaranteed safety timer: Splash screen disappears after 1.5s MAX
        const safetyTimer = setTimeout(() => {
            setIsAppLoading(false);
        }, 1500);

        // Load cached synagogues from localStorage IMMEDIATELY - no server wait
        const cachedSynagogues = localStorage.getItem('cachedSynagogues');
        if (cachedSynagogues) {
            try {
                const parsed = JSON.parse(cachedSynagogues);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSynagogues(parsed);
                    setIsUsingCachedSynagogues(true);
                    console.log('Loaded cached synagogues from localStorage immediately');

                    const currentName = localStorage.getItem('localSynagogueName');
                    if (currentName && !parsed.find(s => s.name === currentName)) {
                        const savedGuestId = localStorage.getItem('guestSynagogueId');
                        const correctSyn = savedGuestId ? parsed.find(s => s.id === savedGuestId) : null;
                        if (correctSyn) {
                            localStorage.setItem('localSynagogueName', correctSyn.name);
                            setLocalSynagogueName(correctSyn.name);
                        } else {
                            localStorage.removeItem('localSynagogueName');
                            setLocalSynagogueName(null);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to parse cached synagogues:', e);
            }
        }

        // Fetch data immediately - DO NOT wait for preferences or auth checks
        fetchAllData();

        // Background non-blocking preferences fetch
        loadPreferences();

        // Background auth token validation
        if (token) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            fetch(`${API_BASE}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal
            })
            .then(res => res.json())
            .then(data => {
                clearTimeout(timeoutId);
                if (data.loggedIn) {
                    setUser(data.user);
                } else {
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                }
            })
            .catch(err => {
                clearTimeout(timeoutId);
                console.error("Auth check failed:", err);
            });
        }

        return () => clearTimeout(safetyTimer);
    }, [token, loadPreferences]);

    // Log app visit / guest open: 30-second delay for guests and single-row session update for logged-in users
    useEffect(() => {
        if (typeof window === 'undefined') return;

        let sessionVisitId = sessionStorage.getItem('app_session_visit_id');
        if (!sessionVisitId) {
            sessionVisitId = 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            sessionStorage.setItem('app_session_visit_id', sessionVisitId);
        }

        const sendLog = () => {
            try {
                const role = user?.role || 'guest';
                const username = user?.username || 'אורח';
                const platform = getPlatform();
                const synId = guestSynagogueId || user?.synagogueId || localStorage.getItem('guestSynagogueId');
                const synName = localSynagogueName || localStorage.getItem('localSynagogueName');
                const screen = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '';

                fetch(`${API_BASE}/api/logs/guest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionVisitId,
                        platform,
                        synagogueId: synId,
                        synagogueName: synName,
                        screen,
                        userRole: role,
                        username: username,
                        timestamp: new Date().toISOString()
                    })
                }).catch(err => console.debug('Guest log silent error:', err));
            } catch (e) {}
        };

        // If user logged in as Admin/Manager, send/update log immediately
        if (user && user.username) {
            sendLog();
            return;
        }

        // For guests, wait 30 seconds before logging visit (prevents double logging when guest logs in as manager)
        const timer = setTimeout(() => {
            sendLog();
        }, 30000);

        return () => clearTimeout(timer);
    }, [user, guestSynagogueId, localSynagogueName]);

    // Keep-alive ping to prevent server idling while app is open (every 10 minutes)
    useEffect(() => {
        const pingTimer = setInterval(() => {
            fetch(`${API_BASE}/api/ping`).catch(() => {});
        }, 10 * 60 * 1000);
        return () => clearInterval(pingTimer);
    }, []);

    // Android hardware / gesture back button and clean exit handler
    const anyModalOpen = isModalVisible || isListVisible || isArchiveVisible || isNiftarModalVisible ||
        isNiftarimListVisible || isLoginVisible || isUserMgmtVisible || isDbStatusModalVisible ||
        isAdminCredentialsVisible || showFirstTimePrompt;

    const closeAllModals = useCallback(() => {
        setIsModalVisible(false);
        setIsListVisible(false);
        setIsArchiveVisible(false);
        setIsNiftarModalVisible(false);
        setIsNiftarimListVisible(false);
        setIsLoginVisible(false);
        setIsUserMgmtVisible(false);
        setIsDbStatusModalVisible(false);
        setIsAdminCredentialsVisible(false);
        setShowFirstTimePrompt(false);
    }, []);

    const handleMobileExit = useCallback(() => {
        if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App?.exitApp) {
            window.Capacitor.Plugins.App.exitApp();
            return;
        }
        // In mobile browser / PWA: close or return cleanly to home screen
        try {
            window.close();
        } catch (e) {}
        if (typeof window !== 'undefined') {
            // If window.close is restricted, minimize history impact
            window.location.replace('about:blank');
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 1. Capacitor native app back button
        let capListener = null;
        if (window.Capacitor?.Plugins?.App?.addListener) {
            window.Capacitor.Plugins.App.addListener('backButton', () => {
                if (anyModalOpen) {
                    closeAllModals();
                } else {
                    window.Capacitor.Plugins.App.exitApp();
                }
            }).then(l => { capListener = l; }).catch(() => {});
        }

        // 2. Web / PWA back gesture navigation
        const handlePopState = (e) => {
            if (anyModalOpen) {
                closeAllModals();
                window.history.pushState({ app: 'synagogue' }, '');
            }
        };

        window.addEventListener('popstate', handlePopState);
        if (!window.history.state) {
            window.history.replaceState({ app: 'synagogue' }, '');
        }

        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (capListener && capListener.remove) capListener.remove();
        };
    }, [anyModalOpen, closeAllModals]);

    const handleLoginSuccess = (newToken, loggedInUser) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(loggedInUser);
        setGuestSynagogueId(null);
        // Clear local file preference on login
        fetch(`${API_BASE}/api/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guestSynagogueId: null })
        }).catch(e => console.error('Failed to clear preferences:', e));
        
        // Save synagogue name for synagogue admin to localStorage IMMEDIATELY
        if (loggedInUser?.role === 'synagogue_admin' && loggedInUser?.synagogueId) {
            // Find synagogue name from cached synagogues
            const cachedSynagogues = localStorage.getItem('cachedSynagogues');
            if (cachedSynagogues) {
                try {
                    const cached = JSON.parse(cachedSynagogues);
                    const syn = cached.find(s => s.id === loggedInUser.synagogueId);
                    if (syn) {
                        localStorage.setItem('localSynagogueName', syn.name);
                        setLocalSynagogueName(syn.name);
                        console.log('Saved synagogue name for admin to localStorage:', syn.name);
                    }
                } catch (e) {
                    console.error('Failed to parse cached synagogues:', e);
                }
            }
        }
        
        setAdminViewSynagogueId(null);
        localStorage.removeItem('adminViewSynagogueId');
        // Re-fetch data immediately with the new valid token
        setTimeout(() => fetchAllData(), 50);
    };


    const handleAdminCredentialsSave = async (values) => {
        setIsSavingAdminCredentials(true);
        try {
            const payload = {
                username: values.username?.trim(),
                password: values.password?.trim()
            };
            const response = await fetch(`${API_BASE}/api/auth/change-credentials`, {
                method: 'POST',
                headers: getHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'עדכון פרטי מנהל נכשל');
            }

            if (data.user) {
                setUser(data.user);
            }

            message.success('פרטי המנהל עודכנו בהצלחה');
            adminCredentialsForm.resetFields();
            setIsAdminCredentialsVisible(false);
        } catch (error) {
            message.error(error.message || 'שגיאה בעדכון פרטי מנהל');
        } finally {
            setIsSavingAdminCredentials(false);
        }
    };

    const handleLogout = () => {
        if (token) {
            fetch(`${API_BASE}/api/auth/logout`, {
                method: 'POST',
                headers: getHeaders()
            }).catch(err => console.error(err));
        }
        localStorage.removeItem('token');
        localStorage.removeItem('adminViewSynagogueId');
        setToken(null);
        setUser(null);
        setAdminViewSynagogueId(null);
        
        // Reset local synagogue name to guest's selection
        const savedGuestId = localStorage.getItem('guestSynagogueId');
        if (savedGuestId) {
            // Try to find the synagogue name from cached synagogues
            const cachedSynagogues = localStorage.getItem('cachedSynagogues');
            if (cachedSynagogues) {
                try {
                    const parsed = JSON.parse(cachedSynagogues);
                    const guestSynagogue = parsed.find(s => s.id === savedGuestId);
                    if (guestSynagogue) {
                        setLocalSynagogueName(guestSynagogue.name);
                        localStorage.setItem('localSynagogueName', guestSynagogue.name);
                    }
                } catch (e) {
                    console.error('Failed to parse cached synagogues:', e);
                }
            }
        } else {
            // No guest selection, clear the name
            setLocalSynagogueName(null);
            localStorage.removeItem('localSynagogueName');
        }
        
        message.success('התנתקת בהצלחה');
    };

    const isAdmin = user && (user.role === 'super_admin' || user.role === 'synagogue_admin' || user.role === 'admin');
    const isSuperAdmin = user?.role === 'super_admin';
    const canSeeAdminDashboard = isSuperAdmin || user?.role === 'admin' || user?.role === 'synagogue_admin';

    const fetchDbStatus = () => {
        fetch(`${API_BASE}/api/db-status`)
            .then(res => res.json())
            .then(data => {
                setDbStatus(data);
                if (data.rawMongoUri && !customUriInput) {
                    setCustomUriInput(data.rawMongoUri);
                }
            })
            .catch(err => console.error("Failed to fetch DB status:", err));
    };

    const handleSaveUri = () => {
        if (!customUriInput) {
            return message.error('נא להזין מחרוזת חיבור תקינה');
        }
        setIsConnectingDb(true);
        fetch(`${API_BASE}/api/db-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mongoUri: customUriInput })
        })
            .then(res => res.json())
            .then(data => {
                setDbStatus(data.status);
                if (data.success) {
                    message.success('הגדרת הכתובת נשמרה והתחברה לענן בהצלחה!');
                } else {
                    message.warning('הכתובת נשמרה אך החיבור לענן נכשל. הוחזר למצב מקומי.');
                }
            })
            .catch(err => message.error('שגיאה בשמירת הגדרת הענן: ' + err.message))
            .finally(() => setIsConnectingDb(false));
    };

    const handleReconnect = () => {
        setIsConnectingDb(true);
        fetch(`${API_BASE}/api/db-reconnect`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                setDbStatus(data.status);
                if (data.success) {
                    message.success('התחבר בהצלחה לבסיס הנתונים בענן!');
                } else {
                    message.error('התחברות לענן נכשלה. בדוק את פרטי החיבור ונסה שוב.');
                }
            })
            .catch(err => message.error('שגיאה בחיבור: ' + err.message))
            .finally(() => setIsConnectingDb(false));
    };

    const fetchAllData = (overrideGuestSynId, overrideAdminSynId) => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        // For guests without token, append ?viewSynagogueId if selected
        const guestSynId = overrideGuestSynId !== undefined ? overrideGuestSynId : guestSynagogueId;
        const adminSynId = overrideAdminSynId !== undefined ? overrideAdminSynId : adminViewSynagogueId;
        
        // For synagogue admin, always use their synagogueId unless explicitly overridden
        let scopedSynId = token ? adminSynId : guestSynId;
        if (token && user?.role === 'synagogue_admin' && !overrideAdminSynId) {
            scopedSynId = user.synagogueId;
        }
        
        // For guests, always use the localStorage saved synagogueId if available
        if (!token && !scopedSynId) {
            const savedGuestId = localStorage.getItem('guestSynagogueId');
            if (savedGuestId) {
                scopedSynId = savedGuestId;
            }
        }
        
        const viewParam = scopedSynId ? `?viewSynagogueId=${encodeURIComponent(scopedSynId)}` : '';

        // Load synagogues first and independently - this is critical for UI
        fetch(`${API_BASE}/api/synagogues`, { headers })
            .then(res => res.json())
            .then(data => {
                setSynagogues(Array.isArray(data) ? data : []);
                // Show first-time prompt if guest has no synagogue selected and synagogues are loaded
                if (!token && !guestSynagogueId && Array.isArray(data) && data.length > 0 && data[0].name) {
                    setShowFirstTimePrompt(true);
                }
            })
            .catch(err => console.error('Failed to fetch synagogues:', err));

        fetch(`${API_BASE}/api/members${viewParam}`, { headers })
            .then(res => res.json())
            .then(data => {
                setMembers(data);
                if (!token && Array.isArray(data)) {
                    const lastMemberId = localStorage.getItem('last_self_registered_member_id');
                    if (lastMemberId) {
                        const existing = data.find(m => String(m.id) === String(lastMemberId));
                        if (existing) {
                            const synIdToMark = existing.synagogueId || scopedSynId;
                            if (synIdToMark) {
                                localStorage.setItem(`guest_self_registered_${synIdToMark}`, String(existing.id || 'registered'));
                            }
                        }
                    }
                }
            })
            .catch(err => console.error("Failed to fetch members:", err));

        fetch(`${API_BASE}/api/niftarim${viewParam}`, { headers })
            .then(res => res.json())
            .then(data => {
                setNiftarim(Array.isArray(data) ? data : []);
            })
            .catch(err => console.error("Failed to fetch niftarim:", err));

        fetchDbStatus();
        
        // Remove loading state after initial data fetch
        setTimeout(() => setIsAppLoading(false), 500);
    };

    // Handler: guest selects a synagogue
    const handleGuestSynagogueChange = async (synId) => {
        setGuestSynagogueId(synId);
        
        // Save to localStorage IMMEDIATELY - no server wait
        localStorage.setItem('guestSynagogueId', synId);
        
        // Save to local file
        try {
            await fetch(`${API_BASE}/api/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guestSynagogueId: synId })
            });
            
            // Save synagogue name to localStorage IMMEDIATELY - no server wait
            const selectedSynagogue = synagogues.find(s => s.id === synId);
            if (selectedSynagogue) {
                localStorage.setItem('localSynagogueName', selectedSynagogue.name);
                setLocalSynagogueName(selectedSynagogue.name);
            }
        } catch (e) {
            console.error('Failed to save preferences:', e);
        }
        
        if (synId) {
            setShowFirstTimePrompt(false); // Hide prompt after selection
        }
        fetchAllData(synId);
    };

    const handleResetGuestSynagogueSelection = () => {
        const currentCount = parseInt(localStorage.getItem('guest_reset_count') || '0', 10);
        if (currentCount >= 3) {
            Modal.error({
                title: 'חסימת איפוס - הגעת למגבלה',
                content: (
                    <div style={{ fontSize: '16px', color: '#cf1322', textAlign: 'center', padding: '12px 0', direction: 'rtl' }}>
                        <strong>הגעת למגבלת 3 איפוסים מורשים!</strong>
                        <div style={{ marginTop: '10px', fontSize: '14px', color: '#444' }}>
                            לא ניתן לאפס בית כנסת שוב. אם נפלה טעות, אנא פנה למנהל בית הכנסת לשחרור המגבלה.
                        </div>
                    </div>
                ),
                okText: 'הבנתי'
            });
            return;
        }

        const newCount = currentCount + 1;
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('guest_self_registered_') || key === 'guestSynagogueId' || key === 'localSynagogueName') {
                    localStorage.removeItem(key);
                }
            });
            localStorage.setItem('guest_reset_count', String(newCount));
        } catch (e) {}

        setGuestSynagogueId(null);
        setLocalSynagogueName('');
        setShowFirstTimePrompt(true);

        Modal.warning({
            title: 'איפוס בית הכנסת',
            content: (
                <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#d4380d', textAlign: 'center', padding: '12px 0', direction: 'rtl' }}>
                    <div>עליך לצאת ולהכנס מחדש</div>
                    <div style={{ fontSize: '14px', color: '#595959', marginTop: '10px', fontWeight: 'normal' }}>
                        ביצעת <strong>{newCount}</strong> מתוך <strong>3</strong> איפוסים מורשים.
                    </div>
                </div>
            ),
            okText: 'אישור ויציאה',
            onOk: () => {
                window.location.reload();
            }
        });
    };

    const handleRemoveSelfRegistration = () => {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('guest_self_registered_') || key === 'last_self_registered_member_id') {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {}
        message.info('תיוג ההרשמה הוסר ממכשיר זה. (נתוני המתפללים במאגר נשמרו ללא שינוי).');
        fetchAllData();
    };

    const handleMarkAlreadyRegistered = (synId) => {
        if (!synId) return;
        try {
            localStorage.setItem(`guest_self_registered_${synId}`, 'already_registered');
            localStorage.setItem(`guest_self_registered_date_${synId}`, new Date().toISOString());
        } catch (e) {
            console.error('Failed to save self_registered in localStorage', e);
        }
        message.success('תודכנת כרשום במכשיר זה. הכפתור הירוק לא יופיע בכניסות הבאות!');
        setSelfRegRefreshKey(prev => prev + 1);
    };

    const handleAdminViewSynagogueChange = (synId) => {
        setAdminViewSynagogueId(synId || null);
        if (synId) {
            localStorage.setItem('adminViewSynagogueId', synId);
        } else {
            localStorage.removeItem('adminViewSynagogueId');
        }
        fetchAllData(undefined, synId || null);
    };


    useEffect(() => {
        // Note: initial data load is handled by the auth useEffect above.
        // This effect only handles periodic DB status checks and auto-reconnect re-fetch.

        // Periodically check DB status to pick up background auto-reconnections

        const interval = setInterval(() => {
            fetch(`${API_BASE}/api/db-status`)
                .then(res => res.json())
                .then(data => {
                    setDbStatus(prevStatus => {
                        // If status changed to connected, re-fetch data from cloud
                        if (!prevStatus.useMongoDB && data.useMongoDB) {
                            fetchAllData();
                        }
                        return data;
                    });
                })
                .catch(() => {});
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    // Hide splash screen when app is loaded
    useEffect(() => {
        if (!isAppLoading) {
            const splashScreen = document.getElementById('splash-screen');
            if (splashScreen) {
                splashScreen.classList.add('hidden');
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                }, 500);
            }
        }
    }, [isAppLoading]);

    const handleSave = (newMember) => {
        // If editing, update existing member
        if (editingMember) {
            return fetch(`${API_BASE}/api/members/${editingMember.id}`, {
                method: 'PUT',
                headers: getHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(newMember),
            })
                .then(res => res.json())
                .then(updatedMember => {
                    // If member was marked as נפ, refresh niftarim list from server and remove from members list
                    const letterVal = updatedMember.letter;
                    const isNiftar = Array.isArray(letterVal)
                        ? letterVal.includes('נפ')
                        : String(letterVal || '').includes('נפ');

                    if (isNiftar) {
                        setMembers(prev => prev.filter(m => m.id !== updatedMember.id));
                        // Refresh niftarim list
                        fetch(`${API_BASE}/api/niftarim`)
                            .then(res => res.json())
                            .then(data => setNiftarim(Array.isArray(data) ? data : []))
                            .catch(err => console.error('Failed to refresh niftarim:', err));
                        // Archive the deceased member
                        const archivePayload = {
                            memberId: updatedMember.id,
                            name: updatedMember.name,
                            aliyah_date: updatedMember.aliyah_date,
                            changeDate: new Date().toISOString(),
                            parasha: getParashaForDate(updatedMember.aliyah_date)
                        };
                        fetch(`${API_BASE}/api/archive`, {
                            method: 'POST',
                            headers: getHeaders({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify(archivePayload)
                        })
                            .then(res => res.json())
                            .then(() => setArchiveRefreshKey(prev => prev + 1))
                            .catch(err => console.error('Failed to archive deceased member:', err));
                    } else {
                        setMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
                    }

                    setIsModalVisible(false);
                    setEditingMember(null);

                    return updatedMember;
                })
                .catch(err => {
                    console.error("Failed to update member:", err);
                    throw err;
                });
        }

        if (editingArchiveRecord) {
            return fetch(`${API_BASE}/api/archive/${editingArchiveRecord.archiveId}`, {
                method: 'PUT',
                headers: getHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(newMember),
            })
                .then(res => res.json())
                .then(updatedArchive => {
                    setIsModalVisible(false);
                    setEditingArchiveRecord(null);
                    setArchiveRefreshKey(prev => prev + 1);
                    return updatedArchive;
                })
                .catch(err => {
                    console.error("Failed to update archive record:", err);
                    throw err;
                });
        }

        // Otherwise, create new member
        return fetch(`${API_BASE}/api/members`, {
            method: 'POST',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(newMember),
        })
            .then(res => res.json())
            .then(savedMember => {
                setMembers(prev => [...prev, savedMember]);
                setIsModalVisible(false);
                return savedMember;
            })
            .catch(err => {
                console.error("Failed to save member:", err);
                throw err;
            });
    };

    const handleEdit = (member) => {
        setEditingMember(member);
        setIsModalVisible(true);
    };

    const handleDelete = (memberId) => {
        fetch(`${API_BASE}/api/members/${memberId}`, { 
            method: 'DELETE',
            headers: getHeaders()
        })
            .then(res => res.json())
            .then(() => {
                setMembers(prev => prev.filter(m => m.id !== memberId));
            })
            .catch(err => console.error("Failed to delete member:", err));
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        setEditingMember(null);
        setEditingArchiveRecord(null);
    };

    const handleViewHistory = (memberId) => {
        setSelectedMemberForArchive(memberId);
        setIsArchiveVisible(true);
    };

    const handleOpenGeneralArchive = () => {
        setSelectedMemberForArchive(null);
        setIsArchiveVisible(true);
    };

    const handleArchiveEdit = (record) => {
        setEditingArchiveRecord(record);
        setIsModalVisible(true);
    };

    const handleArchiveDelete = (archiveId) => {
        fetch(`${API_BASE}/api/archive/${archiveId}`, { 
            method: 'DELETE',
            headers: getHeaders()
        })
            .then(res => res.json())
            .then(() => {
                setArchiveRefreshKey(prev => prev + 1);
            })
            .catch(err => console.error("Failed to delete archive record:", err));
    };

    // -------- Niftarim handlers --------
    const handleSaveNiftar = (niftarData) => {
        if (editingNiftar) {
            return fetch(`${API_BASE}/api/niftarim/${editingNiftar.id}`, {
                method: 'PUT',
                headers: getHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(niftarData),
            })
                .then(res => res.json())
                .then(updated => {
                    setNiftarim(prev => prev.map(n => n.id === updated.id ? updated : n));
                    setIsNiftarModalVisible(false);
                    setEditingNiftar(null);
                    return updated;
                });
        }

        return fetch(`${API_BASE}/api/niftarim`, {
            method: 'POST',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(niftarData),
        })
            .then(res => res.json())
            .then(saved => {
                setNiftarim(prev => [...prev, saved]);
                setIsNiftarModalVisible(false);
                return saved;
            });
    };

    const handleEditNiftar = (niftar) => {
        setEditingNiftar(niftar);
        setIsNiftarModalVisible(true);
    };

    const handleDeleteNiftar = (niftarId) => {
        fetch(`${API_BASE}/api/niftarim/${niftarId}`, { 
            method: 'DELETE',
            headers: getHeaders()
        })
            .then(res => res.json())
            .then(() => setNiftarim(prev => prev.filter(n => n.id !== niftarId)))
            .catch(err => console.error("Failed to delete niftar:", err));
    };

    const handleNiftarModalCancel = () => {
        setIsNiftarModalVisible(false);
        setEditingNiftar(null);
    };

    // ----- Import / Export Handlers -----
    const handleImport = async () => {
        if (!isAdmin) {
            return message.error('נדרשת התחברות כמנהל (admin) כדי לייבא גיבוי נתונים');
        }
        try {
            const result = await loadJsonFile();
            if (!result || !result.json) {
                message.error('ייבוא בוטל או נכשל');
                return;
            }

            const data = result.json;
            const fileName = (result.fileName || '').toLowerCase();
            const headers = getHeaders({ 'Content-Type': 'application/json' });

            // 1. Check if it's the combined export format: { members, niftarim, archive }
            if (data && !Array.isArray(data) && (data.members || data.niftarim || data.archive)) {
                let successCount = 0;
                if (Array.isArray(data.members)) {
                    await fetch(`${API_BASE}/api/members/import`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(data.members)
                    });
                    setMembers(data.members);
                    successCount++;
                }
                if (Array.isArray(data.niftarim)) {
                    await fetch(`${API_BASE}/api/niftarim/import`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(data.niftarim)
                    });
                    setNiftarim(data.niftarim);
                    successCount++;
                }
                if (Array.isArray(data.archive)) {
                    await fetch(`${API_BASE}/api/archive/import`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(data.archive)
                    });
                    setArchiveRefreshKey(prev => prev + 1);
                    successCount++;
                }
                if (successCount > 0) {
                    message.success('הגיבוי המלא (מתפללים, נפטרים וארכיון) יובא ונשמר בהצלחה במערכת!');
                } else {
                    message.error('לא נמצאו נתונים תקינים לייבוא בתוך הקובץ');
                }
                return;
            }

            // 2. Check if it's a raw array (from single file backups: members.json, niftarim.json, archive.json)
            if (Array.isArray(data)) {
                const firstItem = data[0] || {};
                
                const isNiftarim = fileName.includes('niftarim') || 'death_date' in firstItem || 'addedFromMember' in firstItem;
                const isArchive = fileName.includes('archive') || 'changeDate' in firstItem || 'archiveId' in firstItem;
                const isMembers = fileName.includes('members') || 'firstName' in firstItem || 'lastName' in firstItem || 'status' in firstItem;

                if (isNiftarim) {
                    const response = await fetch(`${API_BASE}/api/niftarim/import`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(data)
                    });
                    if (response.ok) {
                        setNiftarim(data);
                        message.success(`יובאו בהצלחה ${data.length} רשומות נפטרים`);
                    } else {
                        const errData = await response.json().catch(() => ({}));
                        throw new Error(errData.error || 'שגיאה בשמירה לשרת');
                    }
                } else if (isArchive) {
                    const response = await fetch(`${API_BASE}/api/archive/import`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(data)
                    });
                    if (response.ok) {
                        setArchiveRefreshKey(prev => prev + 1);
                        message.success(`יובאו בהצלחה ${data.length} רשומות ארכיון`);
                    } else {
                        const errData = await response.json().catch(() => ({}));
                        throw new Error(errData.error || 'שגיאה בשמירה לשרת');
                    }
                } else if (isMembers) {
                    const response = await fetch(`${API_BASE}/api/members/import`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(data)
                    });
                    if (response.ok) {
                        setMembers(data);
                        message.success(`יובאו בהצלחה ${data.length} מתפללים`);
                    } else {
                        const errData = await response.json().catch(() => ({}));
                        throw new Error(errData.error || 'שגיאה בשמירה לשרת');
                    }
                } else {
                    message.error('סוג הקובץ לא זוהה (מצפה למתפללים, נפטרים או ארכיון)');
                }
                return;
            }

            message.error('מבנה קובץ לא תקין');
        } catch (error) {
            console.error('Import failed:', error);
            message.error('הייבוא נכשל: ' + error.message);
        }
    };

    const handleExport = async () => {
        try {
            const archiveRes = await fetch(`${API_BASE}/api/archive`).then(r => r.json()).catch(() => []);
            const data = { 
                members, 
                niftarim, 
                archive: Array.isArray(archiveRes) ? archiveRes : [] 
            };
            await saveJsonFile(data, 'synagogue_full_backup.json');
            message.success('הגיבוי המלא (מתפללים, נפטרים וארכיון) יוצא בהצלחה!');
        } catch (err) {
            message.error('שגיאה ביצוא הגיבוי: ' + err.message);
        }
    };

    const dbStatusText = dbStatus.isConnecting 
        ? 'מתחבר לענן...' 
        : (dbStatus.useMongoDB ? 'מחובר לענן' : 'עבודה מקומית');

    const dbStatusColor = dbStatus.isConnecting
        ? '#1890ff' 
        : (dbStatus.useMongoDB ? '#52c41a' : '#f5222d'); 

    const dbStatusBg = dbStatus.isConnecting
        ? '#e6f7ff'
        : (dbStatus.useMongoDB ? '#f6ffed' : '#fff2e8');

    const dbStatusBorder = dbStatus.isConnecting
        ? '#91d5ff'
        : (dbStatus.useMongoDB ? '#b7eb8f' : '#ffbb96');

    const dbStatusTextColor = dbStatus.isConnecting
        ? '#0050b3'
        : (dbStatus.useMongoDB ? '#389e0d' : '#ad2102');

    return (
        <ConfigProvider locale={heIL} direction="rtl" theme={{
            algorithm: theme.defaultAlgorithm,
            token: {
                fontFamily: 'Assistant, sans-serif',
                fontSize: 16,
            },
            components: {
                Button: {
                    controlHeight: 38,
                    controlHeightLG: 46,
                    controlHeightSM: 30,
                    fontSize: 16,
                    fontSizeLG: 18,
                    fontSizeSM: 14,
                    fontWeight: 600,
                }
            }
        }}>
            {/* Splash Screen */}
            {isAppLoading && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #1a3a5c 0%, #2d6a9f 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    transition: 'opacity 0.5s ease-out'
                }}>
                    <style>{`
                        @keyframes fill {
                            0% { width: 5% }
                            40% { width: 60% }
                            80% { width: 85% }
                            100% { width: 95% }
                        }
                        @keyframes pulse {
                            0%, 100% { opacity: 0.6 }
                            50% { opacity: 1 }
                        }
                    `}</style>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>🕍</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.5px', color: '#fff' }}>
                        ניהול בית כנסת
                    </div>
                    <div style={{ fontSize: '13px', color: '#ffd54f', marginBottom: '8px', fontWeight: 'bold' }}>
                        להתקשרות: אלי סטריק - 052-3375529
                    </div>
                    <div style={{ fontSize: '14px', color: '#a8c8e8', marginBottom: '28px' }}>
                        מאתחל את המערכת...
                    </div>
                    <div style={{ width: '260px', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: '95%',
                            background: 'linear-gradient(90deg, #4fc3f7, #81d4fa)',
                            borderRadius: '3px',
                            animation: 'fill 4s ease-in-out forwards'
                        }} />
                    </div>
                    <div style={{ fontSize: '12px', color: '#7baed4', marginTop: '12px', animation: 'pulse 1.5s infinite' }}>
                        מתחבר לשרת...
                    </div>
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: isMobile() ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile() ? 'flex-start' : 'center', width: '100%', padding: isMobile() ? '10px 14px' : '12px 24px', borderBottom: '1px solid #e8e8e8', background: '#fafafa', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', gap: isMobile() ? '8px' : '0', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: isMobile() ? '100%' : 'auto', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontSize: '14px', color: '#888', fontWeight: 'bold', lineHeight: '1.2' }}>
                                בית כנסת - ניהול מתפללים v{pkg.version}
                            </div>
                            <div style={{ fontSize: '11px', color: '#777', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span>להתקשרות:</span>
                                <a href="tel:0523375529" style={{ color: '#1890ff', textDecoration: 'none', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="חיוג טלפוני">
                                    <PhoneOutlined style={{ fontSize: '10px' }} /> אלי סטריק - 052-3375529
                                </a>
                                <a 
                                    href="https://wa.me/972523375529?text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%90%D7%9C%D7%99%2C%20%D7%A4%D7%A0%D7%99%D7%99%D7%94%20%D7%9E%D7%AA%D7%95%D7%9A%20%D7%9E%D7%A2%D7%A8%D7%9B%D7%AA%20%D7%A0%D7%99%D7%94%D7%95%D7%9C%20%D7%91%D7%99%D7%AA%20%D7%9B%D7%A0%D7%A1%D7%AA" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{
                                        color: '#fff',
                                        background: '#25D366',
                                        borderRadius: '10px',
                                        padding: '1px 7px',
                                        textDecoration: 'none',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}
                                    title="פתיחת שיחת וואטסאפ עם אלי סטריק"
                                >
                                    <WhatsAppOutlined style={{ fontSize: '12px' }} /> וואטסאפ
                                </a>
                            </div>
                        </div>
                        <div 
                            onClick={() => {
                                fetchDbStatus();
                                setIsDbStatusModalVisible(true);
                            }}
                            title="לחץ להצגת פרטי החיבור"
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                fontSize: '12px', 
                                cursor: 'pointer',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: dbStatusBg,
                                border: `1px solid ${dbStatusBorder}`,
                                color: dbStatusTextColor,
                                fontWeight: 'bold',
                                userSelect: 'none'
                            }}
                        >
                            <span style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: dbStatusColor,
                                display: 'inline-block'
                            }} />
                            {dbStatusText}
                        </div>
                        {!isMobile() && (
                            <Tooltip title="הורד קובץ סמל (synagogue.ico) להגדרת סמל בקיצור הדרך במחשב (בלחיצה ימנית > מאפיינים > שנה סמל)">
                                <a
                                    href="/synagogue.ico"
                                    download="synagogue.ico"
                                    onClick={() => message.info('קובץ הסמל (synagogue.ico) הורד. כעת ניתן להיכנס למאפייני קיצור הדרך במחשב ולבחור "שנה סמל".')}
                                    style={{
                                        fontSize: '11px',
                                        color: '#0958d9',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        textDecoration: 'none',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #91caff',
                                        background: '#e6f4ff',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    🕍 הורדת סמל לקיצור דרך (.ico)
                                </a>
                            </Tooltip>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {user ? (
                        <>
                            <span style={{ fontSize: '15px' }}>
                                שלום, <strong>{user.username}</strong> ({user.role === 'super_admin' ? 'מנהל על' : user.role === 'synagogue_admin' ? 'מנהל בית כנסת' : 'צופה'})
                            </span>
                            {isSuperAdmin && (
                                <Select
                                    value={adminViewSynagogueId || undefined}
                                    onChange={handleAdminViewSynagogueChange}
                                    allowClear
                                    placeholder="תצוגה: כל בתי הכנסת"
                                    style={{ minWidth: '220px' }}
                                    size="small"
                                    options={synagogues.map(s => ({ value: s.id, label: `🕍 ${s.name}` }))}
                                    popupMatchSelectWidth={false}
                                />
                            )}
                            {user?.role === 'synagogue_admin' && user?.synagogueId && (
                                <span style={{
                                    fontSize: '13px',
                                    background: '#e6f4ff',
                                    border: '1px solid #91caff',
                                    borderRadius: '12px',
                                    padding: '2px 12px',
                                    color: '#0958d9',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    🕍 {synagogues.find(s => s.id === user.synagogueId)?.name}
                                </span>
                            )}
                            {isAdmin && (
                                <Button size="small" onClick={() => setIsAdminCredentialsVisible(true)}>
                                    שינוי שם משתמש/סיסמה
                                </Button>
                            )}
                            {canSeeAdminDashboard && (
                                <Button type="default" onClick={() => setIsUserMgmtVisible(true)}>
                                    {isSuperAdmin ? 'לוח בקרה ניהולי' : 'ניהול מנהלים ומשתמשים'}
                                </Button>
                            )}
                            <Button type="primary" danger size="small" onClick={handleLogout}>
                                התנתק
                            </Button>
                        </>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', color: '#888' }}>
                                🙋 אורח (צופה בלבד)
                            </span>
                            {localSynagogueName && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                                        🕍 {localSynagogueName}
                                    </span>
                                </div>
                            )}

                            <Button type="primary" size="small" onClick={() => setIsLoginVisible(true)}>
                                התחבר כמנהל
                            </Button>
                        </div>

                    )}
                </div>
            </div>

            <div style={{ padding: isMobile() ? '18px 14px' : '40px 50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile() ? '14px' : '20px', width: '100%', boxSizing: 'border-box' }}>
                {/* Banner - שם בית הכנסת */}
                {(user?.synagogueId && synagogues.find(s => s.id === user.synagogueId)) && (
                    <div style={{
                        background: user?.role === 'viewer'
                            ? 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)'
                            : 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                        borderRadius: '12px',
                        padding: isMobile() ? '14px 20px' : '20px 40px',
                        color: '#fff',
                        textAlign: 'center',
                        boxShadow: user?.role === 'viewer'
                            ? '0 4px 12px rgba(82, 196, 26, 0.3)'
                            : '0 4px 12px rgba(22, 119, 255, 0.3)',
                        marginBottom: '4px',
                        width: '100%',
                        maxWidth: isMobile() ? '100%' : '600px',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{ fontSize: isMobile() ? '12px' : '13px', opacity: 0.85, marginBottom: '4px' }}>
                            בית הכנסת
                        </div>
                        <div style={{ fontSize: isMobile() ? '22px' : '28px', fontWeight: 'bold', letterSpacing: '1px' }}>
                            🕍 {synagogues.find(s => s.id === user.synagogueId)?.name}
                        </div>
                        {synagogues.find(s => s.id === user.synagogueId)?.address && (
                            <div style={{ fontSize: isMobile() ? '12px' : '13px', opacity: 0.8, marginTop: '6px' }}>
                                📍 {synagogues.find(s => s.id === user.synagogueId)?.address}
                            </div>
                        )}
                    </div>
                )}
                {/* Banner לאורח שבחר בית כנסת */}
                {(!user && guestSynagogueId && synagogues.find(s => s.id === guestSynagogueId)) && (
                    <div style={{
                        background: 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)',
                        borderRadius: '12px',
                        padding: isMobile() ? '14px 20px' : '20px 40px',
                        color: '#fff',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(19, 194, 194, 0.3)',
                        marginBottom: '4px',
                        width: '100%',
                        maxWidth: isMobile() ? '100%' : '600px',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{ fontSize: isMobile() ? '12px' : '13px', opacity: 0.85, marginBottom: '4px' }}>
                            בית הכנסת
                        </div>
                        <div style={{ fontSize: isMobile() ? '22px' : '28px', fontWeight: 'bold', letterSpacing: '1px' }}>
                            🕍 {synagogues.find(s => s.id === guestSynagogueId)?.name}
                        </div>
                    </div>
                )}
                {/* Banner לאורח עם שם בית כנסת מקומי */}
                {(!user && !guestSynagogueId && localSynagogueName) && (
                    <div style={{
                        background: 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)',
                        borderRadius: '12px',
                        padding: isMobile() ? '14px 20px' : '20px 40px',
                        color: '#fff',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(19, 194, 194, 0.3)',
                        marginBottom: '4px',
                        width: '100%',
                        maxWidth: isMobile() ? '100%' : '600px',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{ fontSize: isMobile() ? '12px' : '13px', opacity: 0.85, marginBottom: '4px' }}>
                            בית הכנסת
                        </div>
                        <div style={{ fontSize: isMobile() ? '22px' : '28px', fontWeight: 'bold', letterSpacing: '1px' }}>
                            🕍 {localSynagogueName}
                        </div>
                    </div>
                )}
                {/* First-time synagogue selection prompt for guests */}
                {!user && showFirstTimePrompt && !guestSynagogueId && (
                    <div style={{
                        background: 'linear-gradient(135deg, #ff7a45 0%, #d4380d 100%)',
                        borderRadius: '12px',
                        padding: '16px 30px',
                        color: '#fff',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(212, 56, 13, 0.3)',
                        marginBottom: '4px',
                        width: '100%',
                        maxWidth: '600px',
                        animation: 'pulse 2s infinite'
                    }}>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>
                            🙏 אנא בחר בית כנסת לצפייה
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '12px' }}>
                            כדי לצפות בנתוני המתפללים, הארכיון והנפטרים
                        </div>
                        <Select
                            placeholder="בחר בית כנסת..."
                            onChange={handleGuestSynagogueChange}
                            allowClear={false}
                            style={{ minWidth: '200px', fontWeight: 'bold' }}
                            size="middle"
                            options={synagogues.map(s => ({ value: s.id, label: `🕍 ${s.name || s.id}` }))}
                            popupMatchSelectWidth={false}
                        />
                    </div>
                )}
                <div style={{
                    display: 'flex',
                    flexDirection: isMobile() ? 'column' : 'row',
                    gap: isMobile() ? '12px' : '20px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    width: isMobile() ? '100%' : 'auto',
                }}>
                    {isAdmin && (
                        <Button
                            type="primary"
                            size="large"
                            block={isMobile()}
                            style={{ fontSize: '18px', fontWeight: 'bold' }}
                            onClick={() => setIsModalVisible(true)}
                        >
                            הוסף מתפלל חדש
                        </Button>
                    )}
                    {!isAdmin && (guestSynagogueId || localSynagogueName) && (() => {
                        const targetSynId = guestSynagogueId || synagogues.find(s => s.name === localSynagogueName)?.id;
                        const targetSynName = localSynagogueName || synagogues.find(s => String(s.id) === String(targetSynId))?.name;
                        const isGlobalActive = selfRegConfig.allowGuestSelfRegistration !== false && (!selfRegConfig.guestSelfRegistrationExpiresAt || new Date(selfRegConfig.guestSelfRegistrationExpiresAt) > new Date());
                        const synMap = selfRegConfig.synagogueSelfReg || {};

                        let isSynActive = true;
                        if (targetSynId !== undefined && targetSynId !== null && synMap[targetSynId] !== undefined) {
                            isSynActive = synMap[targetSynId];
                        } else if (targetSynId !== undefined && targetSynId !== null && synMap[String(targetSynId)] !== undefined) {
                            isSynActive = synMap[String(targetSynId)];
                        } else if (targetSynName && synMap[targetSynName] !== undefined) {
                            isSynActive = synMap[targetSynName];
                        } else if (targetSynName && synMap[targetSynName.trim()] !== undefined) {
                            isSynActive = synMap[targetSynName.trim()];
                        } else if (synMap && Object.keys(synMap).length > 0) {
                            for (const [k, val] of Object.entries(synMap)) {
                                if (targetSynId && String(k) === String(targetSynId)) {
                                    isSynActive = val;
                                    break;
                                }
                                if (targetSynName && String(k).trim() === String(targetSynName).trim()) {
                                    isSynActive = val;
                                    break;
                                }
                            }
                        }

                        const isOpenForThisSyn = isGlobalActive && isSynActive;
                        const isRegisteredLocally = localStorage.getItem(`guest_self_registered_${targetSynId}`);
                        const isJustRegistered = sessionStorage.getItem(`just_self_registered_${targetSynId}`);

                        const currentResetCount = parseInt(localStorage.getItem('guest_reset_count') || '0', 10);

                        if (isRegisteredLocally) {
                            const showTag = isJustRegistered && !isMobile();
                            if (!showTag) return null;
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', alignSelf: 'center' }}>
                                    <Tag color="success" style={{ fontSize: '15px', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        ✅ נרשמת כמתפלל בבית כנסת זה
                                    </Tag>
                                </div>
                            );
                        }

                        if (isOpenForThisSyn) {
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile() ? '10px' : '12px', flexWrap: 'wrap', justifyContent: 'center', width: isMobile() ? '100%' : 'auto' }}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        block={isMobile()}
                                        style={{
                                            fontSize: '17px',
                                            fontWeight: 'bold',
                                            background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                                            borderColor: '#389e0d',
                                            boxShadow: '0 4px 12px rgba(82, 196, 26, 0.35)'
                                        }}
                                        icon={<UserAddOutlined />}
                                        onClick={() => setIsGuestSelfRegModalVisible(true)}
                                    >
                                        ➕ הרשמה עצמית כמתפלל
                                    </Button>
                                    <Popconfirm
                                        title="אישור הרשמה קודמת"
                                        description="האם כבר נרשמת בעבר כמתפלל בבית כנסת זה?"
                                        onConfirm={() => handleMarkAlreadyRegistered(targetSynId)}
                                        okText="כן, אני כבר רשום"
                                        cancelText="ביטול"
                                        okButtonProps={{ type: 'primary', style: { background: '#52c41a', borderColor: '#52c41a' } }}
                                    >
                                        <Button
                                            size="large"
                                            block={isMobile()}
                                            icon={<CheckCircleOutlined />}
                                            style={{
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                color: '#2b7013',
                                                borderColor: '#b7eb8f',
                                                background: '#f6ffed',
                                                boxShadow: '0 2px 6px rgba(82, 196, 26, 0.15)'
                                            }}
                                        >
                                            אני כבר רשום
                                        </Button>
                                    </Popconfirm>
                                </div>
                            );
                        }

                        return null;
                    })()}
                    <Button
                        size="large"
                        block={isMobile()}
                        style={{ fontSize: '18px', fontWeight: 'bold' }}
                        onClick={() => setIsListVisible(true)}
                    >
                        הצג רשימת מתפללים
                    </Button>
                    <Button
                        size="large"
                        block={isMobile()}
                        style={{ fontSize: '18px', fontWeight: 'bold' }}
                        onClick={handleOpenGeneralArchive}
                    >
                        ארכיון כללי
                    </Button>
                    {/* כפתור נפטרים עם אייקון נר נשמה / זיכרון – מוסתר באנדרואיד/מובייל */}
                    {!isMobile() && (
                        <Tooltip title="רשימת נפטרים">
                            <Button
                                size="large"
                                style={{
                                    background: '#fff1f0',
                                    borderColor: '#ffa39e',
                                    color: '#a8071a',
                                    fontWeight: 'bold',
                                    fontSize: '22px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '54px',
                                    padding: '0 16px'
                                }}
                                onClick={() => setIsNiftarimListVisible(true)}
                            >
                                🕯️
                            </Button>
                        </Tooltip>
                    )}
                    {/* כפתורי ייצוא/ייבוא – מוסתרים בנייד (מנהל יכול לגשת מ-desktop) */}
                    {isAdmin && !isMobile() && (
                        <>
                            <Button
                                size="large"
                                icon={<DownloadOutlined style={{ fontSize: '18px' }} />}
                                style={{ background: '#ffe7ba', borderColor: '#ffbb96', color: '#873800', fontWeight: 'bold', fontSize: '18px' }}
                                onClick={handleExport}
                            >
                                ייצוא גיבוי מלא
                            </Button>
                            <Button
                                size="large"
                                icon={<UploadOutlined style={{ fontSize: '18px' }} />}
                                style={{ background: '#efdbff', borderColor: '#b37feb', color: '#391085', fontWeight: 'bold', fontSize: '18px' }}
                                onClick={handleImport}
                            >
                                ייבוא גיבוי מלא
                            </Button>
                        </>
                    )}
                </div>

                <AddMemberModal
                    visible={isModalVisible}
                    onCancel={handleModalCancel}
                    onSave={handleSave}
                    editingMember={editingMember || editingArchiveRecord}
                    members={members}
                    synagogues={synagogues}
                    currentUser={user}
                    localSynagogueName={localSynagogueName}
                />

                <MembersListModal
                    visible={isListVisible}
                    onCancel={() => setIsListVisible(false)}
                    members={members}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewHistory={handleViewHistory}
                    onAddNew={() => setIsModalVisible(true)}
                    isAdmin={isAdmin}
                    token={token}
                    guestSynagogueId={guestSynagogueId}
                />

                <ArchiveListModal
                    visible={isArchiveVisible}
                    onCancel={() => setIsArchiveVisible(false)}
                    memberId={selectedMemberForArchive}
                    onEdit={handleArchiveEdit}
                    onDelete={handleArchiveDelete}
                    refreshKey={archiveRefreshKey}
                    isAdmin={isAdmin}
                    token={token}
                    guestSynagogueId={guestSynagogueId}
                />

                <NiftarimListModal
                    visible={isNiftarimListVisible}
                    onCancel={() => setIsNiftarimListVisible(false)}
                    niftarim={niftarim}
                    onEdit={handleEditNiftar}
                    onDelete={handleDeleteNiftar}
                    onAddNew={() => {
                        setEditingNiftar(null);
                        setIsNiftarModalVisible(true);
                    }}
                    isAdmin={isAdmin}
                    token={token}
                />

                <AddNiftarModal
                    visible={isNiftarModalVisible}
                    onCancel={handleNiftarModalCancel}
                    onSave={handleSaveNiftar}
                    editingNiftar={editingNiftar}
                />

                <LoginModal
                    visible={isLoginVisible}
                    onCancel={() => setIsLoginVisible(false)}
                    onLoginSuccess={handleLoginSuccess}
                />

                <AdminDashboardModal
                    visible={isUserMgmtVisible}
                    onCancel={() => {
                        setIsUserMgmtVisible(false);
                        loadPreferences();
                    }}
                    token={token}
                    currentUser={user}
                    members={members}
                    niftarim={niftarim}
                    onUpdatePreferences={(updatedPrefs) => {
                        setSelfRegConfig(updatedPrefs);
                    }}
                />

                <Modal
                    title="סטטוס חיבור לבסיס הנתונים"
                    open={isDbStatusModalVisible}
                    onCancel={() => setIsDbStatusModalVisible(false)}
                    footer={[
                        <Button key="reconnect" loading={isConnectingDb} onClick={handleReconnect}>ניסיון חיבור מחדש</Button>,
                        <Button key="refresh" onClick={() => { fetchDbStatus(); }}>רענן</Button>,
                        <Button key="close" type="primary" onClick={() => setIsDbStatusModalVisible(false)}>סגור</Button>
                    ]}
                    width={800}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', direction: 'rtl', marginTop: '16px' }}>
                        <div>
                            <strong>סוג בסיס הנתונים בשימוש: </strong>
                            <span style={{ 
                                fontWeight: 'bold', 
                                color: dbStatusColor 
                            }}>
                                {dbStatus.isConnecting || isConnectingDb
                                    ? 'מתחבר ל-MongoDB Atlas (ענן)...' 
                                    : (dbStatus.useMongoDB ? 'MongoDB Atlas (ענן)' : 'מקומי (קבצי JSON)')}
                            </span>
                        </div>
                        <div>
                            <strong>כתובת שרת הענן הנוכחית: </strong>
                            <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', wordBreak: 'break-all', direction: 'ltr', display: 'inline-block' }}>
                                {dbStatus.mongoUri || 'mongodb+srv://Alumim:alumim99@cluster1.i8jyvvd.mongodb.net/?appName=Cluster1'}
                            </code>
                        </div>

                        <div style={{ background: '#fafafa', padding: '12px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>עריכת/הגדרת מחרוזת החיבור לענן (MONGODB_URI):</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Input 
                                    value={customUriInput} 
                                    onChange={(e) => setCustomUriInput(e.target.value)} 
                                    placeholder="mongodb+srv://user:pass@cluster..."
                                    style={{ direction: 'ltr', textAlign: 'left' }}
                                />
                                <Button type="primary" loading={isConnectingDb} onClick={handleSaveUri}>
                                    שמור וחבר
                                </Button>
                            </div>
                        </div>

                        {dbStatus.error && (
                            <div style={{ color: '#f5222d', background: '#fff1f0', border: '1px solid #ffa39e', padding: '12px', borderRadius: '4px' }}>
                                <strong>שגיאת החיבור לענן שדווחה: </strong>
                                <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', fontSize: '12px', direction: 'ltr', textAlign: 'left' }}>
                                    {dbStatus.error}
                                </pre>
                            </div>
                        )}
                    </div>
                </Modal>

                <Modal
                    title="עדכון פרטי מנהל"
                    open={isAdminCredentialsVisible}
                    onCancel={() => {
                        setIsAdminCredentialsVisible(false);
                        adminCredentialsForm.resetFields();
                    }}
                    onOk={() => adminCredentialsForm.submit()}
                    okText="שמור"
                    cancelText="ביטול"
                    confirmLoading={isSavingAdminCredentials}
                    width={420}
                    destroyOnClose
                >
                    <Form
                        form={adminCredentialsForm}
                        layout="vertical"
                        onFinish={handleAdminCredentialsSave}
                        initialValues={{ username: user?.username || '' }}
                    >
                        <Form.Item
                            name="username"
                            label="שם משתמש חדש"
                            rules={[
                                { required: true, message: 'נא להזין שם משתמש' },
                                { min: 3, message: 'שם משתמש חייב להכיל לפחות 3 תווים' }
                            ]}
                        >
                            <Input placeholder="לדוגמה: admin" />
                        </Form.Item>
                        <Form.Item
                            name="password"
                            label="סיסמה חדשה"
                            rules={[
                                { required: true, message: 'נא להזין סיסמה חדשה' },
                                { min: 4, message: 'סיסמה חייבת להכיל לפחות 4 תווים' }
                            ]}
                        >
                            <Input.Password placeholder="סיסמה חדשה" />
                        </Form.Item>
                    </Form>
                </Modal>

                {/* Guest Self-Registration Modal */}
                <GuestSelfRegisterModal
                    visible={isGuestSelfRegModalVisible}
                    onCancel={() => setIsGuestSelfRegModalVisible(false)}
                    onSuccess={() => {
                        setIsGuestSelfRegModalVisible(false);
                        fetchAllData();
                    }}
                    synagogueId={guestSynagogueId || (synagogues.find(s => s.name === localSynagogueName)?.id)}
                    synagogueName={localSynagogueName || synagogues.find(s => s.id === (guestSynagogueId || (synagogues.find(s => s.name === localSynagogueName)?.id)))?.name || ''}
                />

                {/* Footer with contact info */}
                <div style={{ textAlign: 'center', padding: '16px 8px', fontSize: '12px', color: '#888', borderTop: '1px solid #e8e8e8', width: '100%', marginTop: '36px', background: '#fafafa', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span>בית כנסת - ניהול מתפללים | פיתוח והתקשרות: אלי סטריק</span>
                    <a href="tel:0523375529" style={{ color: '#1890ff', textDecoration: 'none', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <PhoneOutlined /> 052-3375529
                    </a>
                    <a 
                        href="https://wa.me/972523375529?text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%90%D7%9C%D7%99%2C%20%D7%A4%D7%A0%D7%99%D7%99%D7%94%20%D7%9E%D7%AA%D7%95%D7%9A%20%D7%9E%D7%A2%D7%A8%D7%9B%D7%AA%20%D7%A0%D7%99%D7%94%D7%95%D7%9C%20%D7%91%D7%99%D7%AA%20%D7%9B%D7%A0%D7%A1%D7%AA" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                            color: '#fff',
                            background: '#25D366',
                            borderRadius: '12px',
                            padding: '2px 10px',
                            textDecoration: 'none',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 3px rgba(37, 211, 102, 0.3)'
                        }}
                        title="שלח הודעה בוואטסאפ"
                    >
                        <WhatsAppOutlined /> שלח הודעה בוואטסאפ
                    </a>
                </div>
            </div>
        </ConfigProvider>
    );
}

export default App;


