import React, { useState, useMemo } from 'react';
import { Modal, Table, Button, Popconfirm, Input, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, SearchOutlined, PrinterOutlined, DownloadOutlined, UploadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { saveJsonFile, loadJsonFile } from '../utils/fileUtils';

const NiftarimListModal = ({ visible, onCancel, niftarim, onEdit, onDelete, onAddNew, isAdmin }) => {
    const [searchText, setSearchText] = useState('');
    // Safety: ensure niftarim is always an array
    const safeNiftarim = Array.isArray(niftarim) ? niftarim : [];

    const filteredNiftarim = useMemo(() => {
        return safeNiftarim
            .filter(n =>
                n.lastName?.toLowerCase().includes(searchText.toLowerCase()) ||
                n.firstName?.toLowerCase().includes(searchText.toLowerCase())
            )
            .sort((a, b) => {
                const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '', 'he');
                if (lastNameCompare !== 0) return lastNameCompare;
                return (a.firstName || '').localeCompare(b.firstName || '', 'he');
            });
    }, [safeNiftarim, searchText]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("לא ניתן לפתוח חלון הדפסה. ייתכן שחוסם פופ-אפים פעיל.");
            return;
        }

        const html = `
            <html dir="rtl" lang="he">
            <head>
                <title>&nbsp;</title>
                <style>
                    @page { size: auto; margin: 0mm; }
                    body { font-family: 'Assistant', sans-serif; padding: 20px; margin: 0; }
                    .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .title { font-size: 22px; font-weight: bold; margin: 0; color: #00008B; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: none; padding: 3px 6px; text-align: right; line-height: 14pt; }
                    th { border-bottom: 1px solid #333; font-weight: bold; font-size: 12pt; color: #0066cc; }
                    td { font-size: 11pt; }
                    tr:nth-child(even) { background-color: #f8f8f8; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">רשימת נפטרים</div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>מעמד</th>
                            <th>תואר</th>
                            <th>שם משפחה</th>
                            <th>שם פרטי</th>
                            <th>שם אב</th>
                            <th>תאריך פטירה</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredNiftarim.map(n => `
                            <tr>
                                <td>${n.status || ''}</td>
                                <td>${n.title || ''}</td>
                                <td>${n.lastName || '-'}</td>
                                <td>${n.firstName || '-'}</td>
                                <td>${n.fatherName || '-'}</td>
                                <td>${n.death_date || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const columns = [
        {
            title: 'מעמד',
            dataIndex: 'status',
            key: 'status',
            width: 80,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'תואר',
            dataIndex: 'title',
            key: 'title',
            width: 70,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'שם משפחה',
            dataIndex: 'lastName',
            key: 'lastName',
            width: 130,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'שם פרטי',
            dataIndex: 'firstName',
            key: 'firstName',
            width: 130,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'שם אב',
            dataIndex: 'fatherName',
            key: 'fatherName',
            width: 110,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'תאריך פטירה',
            dataIndex: 'death_date',
            key: 'death_date',
            width: 160,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold', color: '#595959', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'הערות',
            dataIndex: 'notes',
            key: 'notes',
            width: 130,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'פעולות',
            key: 'actions',
            width: 90,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            render: (_, record) => isAdmin ? (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(record)}
                        title="עריכה"
                    />
                    <Popconfirm
                        title="האם למחוק נפטר זה?"
                        onConfirm={() => onDelete(record.id)}
                        okText="כן"
                        cancelText="לא"
                    >
                        <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            title="מחיקה"
                        />
                    </Popconfirm>
                </div>
            ) : null,
        },
    ];

    return (
        <Modal
            title={
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
                    <span style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#00008B',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none'
                    }}>רשימת נפטרים</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                        {isAdmin && (
                            <Button
                                onClick={onAddNew}
                                style={{
                                    background: '#e6f7ff',
                                    color: '#003a8c',
                                    borderColor: '#91d5ff',
                                    fontWeight: 'bold'
                                }}
                            >
                                הוספת נפטר
                            </Button>
                        )}
                        <Button
                            type="primary"
                            icon={<PrinterOutlined />}
                            onClick={handlePrint}
                            style={{ background: '#52c41a', borderColor: '#52c41a', color: 'black', fontWeight: 'bold' }}
                        >
                            הדפס
                        </Button>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={() => saveJsonFile(safeNiftarim, 'niftarim.json')}
                            title="ייצוא לקובץ"
                            style={{ background: '#ffe7ba', borderColor: '#ffbb96', color: 'black', fontWeight: 'bold' }}
                        >
                            ייצוא
                        </Button>

                        <Tooltip
                            title={<div style={{ color: '#006400' }}>בחר פעם ראשונה נתיב בו יש לשמור גיבויים. בכל פעם שנרצה ליצא או ליבא ברירת המחדל תעדיף קודם נתיב זה</div>}
                            placement="bottomLeft"
                            zIndex={1200}
                            overlayInnerStyle={{
                                backgroundColor: '#ffffcc',
                                border: '1px solid #d9d9d9',
                                borderRadius: '8px',
                                padding: '8px'
                            }}
                        >
                            <QuestionCircleOutlined style={{ color: '#1890ff', cursor: 'help', fontSize: '16px' }} />
                        </Tooltip>

                        <Button
                            icon={<UploadOutlined />}
                            onClick={async () => {
                                const result = await loadJsonFile('niftarim-import-handle');
                                if (!result) return;
                                const { json } = result;
                                if (confirm(`האם אתה בטוח שברצונך לייבא ${json.length} נפטרים? פעולה זו תחליף את הרשימה הקיימת!`)) {
                                    try {
                                        const response = await fetch('http://localhost:3000/api/niftarim/import', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(json)
                                        });
                                        if (!response.ok) {
                                            const errorData = await response.json().catch(() => ({}));
                                            throw new Error(errorData.error || `Server returned ${response.status}`);
                                        }
                                        alert('הייבוא הושלם בהצלחה! אנא רענן את הדף.');
                                        window.location.reload();
                                    } catch (err) {
                                        alert('שגיאה בייבוא הקובץ: ' + err.message);
                                    }
                                }
                            }}
                            title="ייבוא מקובץ"
                            style={{ background: '#efdbff', borderColor: '#b37feb', color: '#391085', fontWeight: 'bold' }}
                        >
                            ייבוא
                        </Button>
                    </div>
                </div>
            }
            open={visible}
            onCancel={onCancel}
            footer={[
                <Button key="close" onClick={onCancel}>סגור</Button>
            ]}
            width="100%"
            style={{ top: 0, margin: 0, maxWidth: '100vw', padding: 0, height: '100vh' }}
            className="niftarim-list-modal full-screen-modal"
            styles={{
                header: { borderBottom: '1px solid #f0f0f0' },
                body: { padding: '10px', height: 'calc(100vh - 110px)', overflowY: 'auto', overflowX: 'hidden' },
                mask: { backgroundColor: 'rgba(0, 0, 0, 0.45)' },
                content: { height: '100vh', display: 'flex', flexDirection: 'column' }
            }}
        >
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Input
                    placeholder="חיפוש לפי שם..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: '300px' }}
                    allowClear
                />
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    סה"כ נפטרים: {filteredNiftarim.length} {searchText && `(מתוך ${safeNiftarim.length})`}
                </span>
            </div>
            <Table
                dataSource={filteredNiftarim}
                columns={columns}
                rowKey="id"
                tableLayout="fixed"
                pagination={false}
                scroll={{ y: 'calc(100vh - 250px)' }}
            />
        </Modal>
    );
};

export default NiftarimListModal;
