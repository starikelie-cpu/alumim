import React, { useState, useEffect } from 'react';
import { getParashaForDate } from './utils/hebrewDateUtils';
import { Button, ConfigProvider, theme, message } from 'antd';
import heIL from 'antd/locale/he_IL';
import AddMemberModal from './components/AddMemberModal';
import pkg from '../package.json';
import { loadJsonFile, saveJsonFile } from './utils/fileUtils';
import MembersListModal from './components/MembersListModal';
import ArchiveListModal from './components/ArchiveListModal';
import AddNiftarModal from './components/AddNiftarModal';
import NiftarimListModal from './components/NiftarimListModal';
import LoginModal from './components/LoginModal';
import UserManagementModal from './components/UserManagementModal';
import { API_BASE } from './config';

function App() {
    const [members, setMembers] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isListVisible, setIsListVisible] = useState(false);
    const [isArchiveVisible, setIsArchiveVisible] = useState(false);
    const [selectedMemberForArchive, setSelectedMemberForArchive] = useState(null);
    const [editingMember, setEditingMember] = useState(null);
    const [editingArchiveRecord, setEditingArchiveRecord] = useState(null);
    const [archiveRefreshKey, setArchiveRefreshKey] = useState(0);

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

    const getHeaders = (extraHeaders = {}) => {
        const headers = { ...extraHeaders };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    };

    useEffect(() => {
        if (token) {
            fetch(`${API_BASE}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data.loggedIn) {
                    setUser(data.user);
                } else {
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                }
            })
            .catch(err => {
                console.error("Auth check failed:", err);
            });
        }
    }, [token]);

    const handleLoginSuccess = (newToken, loggedInUser) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(loggedInUser);
    };

    const handleLogout = () => {
        if (token) {
            fetch(`${API_BASE}/api/auth/logout`, {
                method: 'POST',
                headers: getHeaders()
            }).catch(err => console.error(err));
        }
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        message.success('התנתקת בהצלחה');
    };

    const isAdmin = user && user.role === 'admin';

    useEffect(() => {
        fetch(`${API_BASE}/api/members`)
            .then(res => res.json())
            .then(data => setMembers(data))
            .catch(err => console.error("Failed to fetch members:", err));

        fetch(`${API_BASE}/api/niftarim`)
            .then(res => res.json())
            .then(data => setNiftarim(Array.isArray(data) ? data : []))
            .catch(err => console.error("Failed to fetch niftarim:", err));
    }, []);

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
                    console.log('Member Updated:', updatedMember);
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
                    console.log('Archive Record Updated:', updatedArchive);
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
                console.log('Member Saved:', savedMember);
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
                console.log('Member Deleted:', memberId);
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
                console.log('Archive Record Deleted:', archiveId);
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
        try {
            const result = await loadJsonFile();
            if (!result || !result.json) {
                message.error('ייבוא בוטל או נכשל');
                return;
            }

            const data = result.json;
            const fileName = (result.fileName || '').toLowerCase();

            // 1. Check if it's the combined export format: { members, niftarim }
            if (data && !Array.isArray(data) && (data.members || data.niftarim)) {
                let successCount = 0;
                if (Array.isArray(data.members)) {
                    await fetch(`${API_BASE}/api/members/import`, {
                        method: 'POST',
                        headers: getHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(data.members)
                    });
                    setMembers(data.members);
                    successCount++;
                }
                if (Array.isArray(data.niftarim)) {
                    await fetch(`${API_BASE}/api/niftarim/import`, {
                        method: 'POST',
                        headers: getHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(data.niftarim)
                    });
                    setNiftarim(data.niftarim);
                    successCount++;
                }
                if (Array.isArray(data.archive)) {
                    await fetch(`${API_BASE}/api/archive/import`, {
                        method: 'POST',
                        headers: getHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(data.archive)
                    });
                    successCount++;
                }
                if (successCount > 0) {
                    message.success('הנתונים יובאו ונשמרו בהצלחה בשרת');
                } else {
                    message.error('לא נמצאו נתונים תקינים לייבוא');
                }
                return;
            }

            // 2. Check if it's a raw array (from backup files: members.json, niftarim.json, archive.json)
            if (Array.isArray(data)) {
                const firstItem = data[0] || {};
                
                const isNiftarim = fileName.includes('niftarim') || 'death_date' in firstItem || 'addedFromMember' in firstItem;
                const isArchive = fileName.includes('archive') || 'changeDate' in firstItem || 'archiveId' in firstItem;
                const isMembers = fileName.includes('members') || 'firstName' in firstItem || 'lastName' in firstItem || 'status' in firstItem;

                if (isNiftarim) {
                    const response = await fetch(`${API_BASE}/api/niftarim/import`, {
                        method: 'POST',
                        headers: getHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(data)
                    });
                    if (response.ok) {
                        setNiftarim(data);
                        message.success(`יובאו בהצלחה ${data.length} רשומות נפטרים`);
                    } else {
                        throw new Error('שגיאה בשמירה לשרת');
                    }
                } else if (isArchive) {
                    const response = await fetch(`${API_BASE}/api/archive/import`, {
                        method: 'POST',
                        headers: getHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(data)
                    });
                    if (response.ok) {
                        setArchiveRefreshKey(prev => prev + 1);
                        message.success(`יובאו בהצלחה ${data.length} רשומות ארכיון`);
                    } else {
                        throw new Error('שגיאה בשמירה לשרת');
                    }
                } else if (isMembers) {
                    const response = await fetch(`${API_BASE}/api/members/import`, {
                        method: 'POST',
                        headers: getHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(data)
                    });
                    if (response.ok) {
                        setMembers(data);
                        message.success(`יובאו בהצלחה ${data.length} מתפללים`);
                    } else {
                        throw new Error('שגיאה בשמירה לשרת');
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
        const data = { members, niftarim };
        await saveJsonFile(data, 'export.json');
        message.success('Data exported successfully');
    };

    return (
        <ConfigProvider locale={heIL} direction="rtl" theme={{
            algorithm: theme.defaultAlgorithm,
            token: {
                fontFamily: 'Assistant, sans-serif',
            },
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 24px', borderBottom: '1px solid #e8e8e8', background: '#fafafa', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '14px', color: '#888', fontWeight: 'bold' }}>
                    בית כנסת - ניהול מתפללים v{pkg.version}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {user ? (
                        <>
                            <span style={{ fontSize: '15px' }}>
                                שלום, <strong>{user.username}</strong> ({user.role === 'admin' ? 'מנהל' : 'צופה'})
                            </span>
                            {isAdmin && (
                                <Button type="default" onClick={() => setIsUserMgmtVisible(true)}>
                                    ניהול משתמשים
                                </Button>
                            )}
                            <Button type="primary" danger size="small" onClick={handleLogout}>
                                התנתק
                            </Button>
                        </>
                    ) : (
                        <>
                            <span style={{ fontSize: '15px', color: '#666' }}>חיבור: <strong>אורח (צופה בלבד)</strong></span>
                            <Button type="primary" size="small" onClick={() => setIsLoginVisible(true)}>
                                התחבר כמנהל
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div style={{ padding: '40px 50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {isAdmin && (
                        <Button type="primary" size="large" onClick={() => setIsModalVisible(true)}>
                            הוסף מתפלל חדש
                        </Button>
                    )}
                    <Button size="large" onClick={() => setIsListVisible(true)}>
                        הצג רשימת מתפללים
                    </Button>
                    <Button size="large" onClick={handleOpenGeneralArchive}>
                        ארכיון כללי
                    </Button>
                    <Button
                        size="large"
                        style={{ background: '#fff1f0', borderColor: '#ffa39e', color: '#a8071a', fontWeight: 'bold' }}
                        onClick={() => setIsNiftarimListVisible(true)}
                    >
                        נפטרים
                    </Button>
                </div>

                <AddMemberModal
                    visible={isModalVisible}
                    onCancel={handleModalCancel}
                    onSave={handleSave}
                    editingMember={editingMember || editingArchiveRecord}
                    members={members}
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
                />

                <ArchiveListModal
                    visible={isArchiveVisible}
                    onCancel={() => setIsArchiveVisible(false)}
                    memberId={selectedMemberForArchive}
                    onEdit={handleArchiveEdit}
                    onDelete={handleArchiveDelete}
                    refreshKey={archiveRefreshKey}
                    isAdmin={isAdmin}
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

                <UserManagementModal
                    visible={isUserMgmtVisible}
                    onCancel={() => setIsUserMgmtVisible(false)}
                    token={token}
                />
            </div>
        </ConfigProvider>
    );
}

export default App;


