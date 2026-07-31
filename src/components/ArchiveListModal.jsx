import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Button, Input, Popconfirm, Select, Tooltip } from 'antd';
import { SearchOutlined, HistoryOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, DownloadOutlined, UploadOutlined, ArrowUpOutlined, ArrowDownOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { parseHebrewDate, getHebrewMonthNumber, yearToGematria, translateParashaName, formatHebrewDateToTextual, getShmitaYearStatus, getUpcomingShabbatInfo, getDaysSinceAliyah, getAbsDate } from '../utils/hebrewDateUtils';
import { HDate } from '@hebcal/core';
import { saveJsonFile, loadJsonFile } from '../utils/fileUtils';


const ArchiveListModal = ({ visible, onCancel, onEdit, onDelete, refreshKey, memberId = null, isAdmin }) => {
    const [archiveData, setArchiveData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedAliyahType, setSelectedAliyahType] = useState('');
    const [dateSortOrder, setDateSortOrder] = useState(null); // null, 'asc', 'desc'
    const [selectedLastName, setSelectedLastName] = useState('');
    const [selectedFirstName, setSelectedFirstName] = useState('');

    useEffect(() => {
        if (visible) {
            fetchArchive();
        }
    }, [visible, memberId, refreshKey]);

    const fetchArchive = async () => {
        setLoading(true);
        try {
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const url = memberId
                ? `http://localhost:3000/api/archive/${memberId}?t=${timestamp}`
                : `http://localhost:3000/api/archive?t=${timestamp}`;
            const response = await fetch(url);
            const data = await response.json();
            // Pre-calculate absolute dates and sorting values
            const enrichedData = data.map(item => ({
                ...item,
                _absDate: getAbsDate(item.aliyah_date),
                _changeDateMs: item.changeDate ? new Date(item.changeDate).getTime() : 0
            }));
            // Sort by changeDate descending (newest first)
            const sortedData = enrichedData.sort((a, b) => b._changeDateMs - a._changeDateMs);
            setArchiveData(sortedData);
        } catch (error) {
            console.error('Failed to fetch archive:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get unique aliyah types from archive data
    const uniqueAliyahTypes = useMemo(() => {
        return [...new Set(archiveData.map(item => item.aliyah_type).filter(Boolean))];
    }, [archiveData]);

    // Get unique last names from archive data
    const uniqueLastNames = useMemo(() => {
        return [...new Set(archiveData.map(item => item.lastName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he'));
    }, [archiveData]);

    // Get unique first names filtered by selected last name
    const filteredFirstNames = useMemo(() => {
        const source = selectedLastName
            ? archiveData.filter(item => item.lastName === selectedLastName)
            : archiveData;
        return [...new Set(source.map(item => item.firstName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he'));
    }, [archiveData, selectedLastName]);

    const translateText = (text) => {
        if (!text) return '-';
        const map = {
            'Yom Kippur': 'יום כיפור',
            'Sukkot': 'סוכות',
            'Pesach': 'פסח',
            'Shavuot': 'שבועות',
            'Rosh Hashana': 'ראש השנה',
            'Chanukah': 'חנוכה',
            'Purim': 'פורים',
            'Cohen': 'כהן',
            'Levi': 'לוי',
            'Israel': 'ישראל',
            'Shabbat': 'שבת',
            'Rosh Chodesh': 'ראש חודש',
            'Holidoys': 'חגים',
            'Fast Day': 'צום'
        };
        let result = String(text);
        Object.entries(map).forEach(([eng, heb]) => {
            const regex = new RegExp(eng, 'gi');
            result = result.replace(regex, heb);
        });
        return result;
    };

    const handlePrint = () => {
        try {
            let printData = [...filteredData];

            // Sorting: Always sort by aliyah_date ascending (Oldest to Newest) when printing
            printData.sort((a, b) => (a._absDate || 0) - (b._absDate || 0));

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert("לא ניתן לפתוח חלון הדפסה. ייתכן שחוסם פופ-אפים פעיל.");
                return;
            }

            const currentHYear = new HDate().getFullYear();

            // Calculate year range from printData
            let minHYear = currentHYear;
            let maxHYear = currentHYear;

            if (printData.length > 0) {
                const years = printData.map(item => {
                    const p = parseHebrewDate(item.aliyah_date);
                    return p ? p.year : null;
                }).filter(Boolean);

                if (years.length > 0) {
                    minHYear = Math.min(...years);
                    maxHYear = Math.max(...years);
                }
            }

            const minYearName = yearToGematria(minHYear);
            const maxYearName = yearToGematria(maxHYear);
            const yearRangeDisp = minHYear === maxHYear ? `שנת ${minYearName}` : `לשנים ${minYearName} - ${maxYearName}`;

            const titleDisplay = selectedAliyahType ? `דו"ח עליות - ${translateText(selectedAliyahType)}` : 'דו"ח עליות';
            const todayHebrew = new HDate().renderGematriya(true);

            const html = `
                <html dir="rtl" lang="he">
                <head>
                    <title>&nbsp;</title>
                    <style>
                        @page { size: auto; margin: 0mm; }
                        body { font-family: 'Assistant', sans-serif; padding: 15px; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 10px; position: relative; padding-top: 5px; }
                        .today-date { position: absolute; top: 0; left: 0; font-size: 14pt; color: #00008B; font-weight: bold; }
                        .title { font-size: 28px; font-weight: bold; margin: 0; color: #00008B; }
                        .filter-info { font-size: 14pt; color: #00008B; font-weight: bold; margin-top: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 5px; border: none; }
                        th, td { border: none; padding: 4px 8px; text-align: right; }
                        th { background-color: #f5f5f5; font-weight: bold; font-size: 16px; border-bottom: 2px solid #333; text-align: right; }
                        td { font-size: 15pt; line-height: 17pt; border-bottom: 1px solid #f9f9f9; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="today-date">${todayHebrew}</div>
                        <div class="title">${titleDisplay}</div>
                        <div class="filter-info">${yearRangeDisp}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                 <th style="width: 5%;">מעמד</th>
                                 <th style="width: 20%;">שם משפחה</th>
                                 <th style="width: 20%;">שם פרטי</th>
                                 <th style="width: 15%;">שם אב</th>
                                 <th style="width: 12%;">תאריך עליה</th>
                                 <th style="width: 28%;">פרשת עליה / חג</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${printData.map(item => {
                const statusStr = String(item.status || '');
                const isEmptyStatus = !statusStr || statusStr.trim() === '';
                const showStatus = isEmptyStatus ? '' : translateText(statusStr);

                return `
                                    <tr>
                                        <td>${showStatus}</td>
                                        <td>${translateText(item.lastName)}</td>
                                        <td>${translateText(item.firstName)}</td>
                                         <td>${translateText(item.fatherName)}</td>
                                         <td style="white-space: nowrap;">${formatHebrewDateToTextual(item.aliyah_date, true) || '-'}</td>
                                         <td>${translateParashaName(item.aliyah_parasha)}</td>
                                    </tr>
                                `;
            }).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `;
            printWindow.document.write(html);
            printWindow.document.close();

            // Reliable printing
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        } catch (error) {
            console.error("Print error:", error);
        }
    };

    const columns = useMemo(() => [
        {
            title: 'מעמד',
            dataIndex: 'status',
            key: 'status',
            width: 70,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span>שם משפחה</span>
                    <div style={{
                        padding: '1px',
                        background: '#ffffff',
                        border: '1px solid #808080',
                        borderBottomColor: '#dfdfdf',
                        borderRightColor: '#dfdfdf',
                        boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 1px rgba(255,255,255,1)',
                        borderRadius: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Select
                            placeholder="הכל"
                            value={selectedLastName || undefined}
                            onChange={(value) => { setSelectedLastName(value || ''); setSelectedFirstName(''); }}
                            style={{ width: '120px', fontSize: '13px' }}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            variant="borderless"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {uniqueLastNames.map(n => <Select.Option key={n} value={n}>{n}</Select.Option>)}
                        </Select>
                    </div>
                </div>
            ),
            dataIndex: 'lastName',
            key: 'lastName',
            width: 150,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: (
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}>
                    <style>{`
                        .clear-names-btn {
                            padding: 2px 10px;
                            font-size: 11px;
                            font-weight: bold;
                            color: #fff;
                            background: linear-gradient(180deg, #ff7875 0%, #f5222d 100%);
                            border: 2px solid #a8071a;
                            border-radius: 4px;
                            cursor: pointer;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4);
                            white-space: nowrap;
                            transition: all 0.05s ease;
                            transform: translateY(0);
                        }
                        .clear-names-btn:active {
                            transform: translateY(3px);
                            box-shadow: 0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
                        }
                        .export-btn-3d {
                            background: linear-gradient(180deg, #ffe7ba 0%, #ffc069 100%) !important;
                            border: 2px solid #d46b08 !important;
                            color: black !important;
                            font-weight: bold !important;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6) !important;
                            transition: all 0.05s ease !important;
                        }
                        .export-btn-3d:active {
                            transform: translateY(3px) !important;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
                        }
                        .import-btn-3d {
                            background: linear-gradient(180deg, #efdbff 0%, #b37feb 100%) !important;
                            border: 2px solid #531dab !important;
                            color: #22075e !important;
                            font-weight: bold !important;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6) !important;
                            transition: all 0.05s ease !important;
                        }
                        .import-btn-3d:active {
                            transform: translateY(3px) !important;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
                        }
                        .print-btn-3d {
                            background: linear-gradient(180deg, #95de64 0%, #52c41a 100%) !important;
                            border: 2px solid #237804 !important;
                            color: black !important;
                            font-weight: bold !important;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6) !important;
                            transition: all 0.05s ease !important;
                        }
                        .print-btn-3d:active {
                            transform: translateY(3px) !important;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
                        }
                        .inset-select .ant-select-selector,
                        .inset-select.ant-select .ant-select-selector,
                        .inset-select .ant-select-selector:hover {
                            box-shadow: inset 3px 3px 6px rgba(0,0,0,0.3), inset -2px -2px 4px rgba(255,255,255,0.6) !important;
                            background: linear-gradient(180deg, #ddd 0%, #f0f0f0 100%) !important;
                            border: 2px solid #999 !important;
                            border-top-color: #777 !important;
                            border-left-color: #777 !important;
                            border-bottom-color: #ccc !important;
                            border-right-color: #ccc !important;
                            border-radius: 3px !important;
                        }
                    `}</style>
                    <button
                        className="clear-names-btn"
                        onClick={(e) => { e.stopPropagation(); setSelectedLastName(''); setSelectedFirstName(''); }}
                    >
                        מחק
                    </button>
                </div>
            ),
            key: 'clearNames',
            width: 45,
            onHeaderCell: () => ({ style: { padding: '4px 2px' } }),
            render: () => null,
        },
        {
            title: (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span>שם פרטי</span>
                    <div style={{
                        padding: '1px',
                        background: '#ffffff',
                        border: '1px solid #808080',
                        borderBottomColor: '#dfdfdf',
                        borderRightColor: '#dfdfdf',
                        boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 1px rgba(255,255,255,1)',
                        borderRadius: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Select
                            placeholder="הכל"
                            value={selectedFirstName || undefined}
                            onChange={(value) => setSelectedFirstName(value || '')}
                            style={{ width: '120px', fontSize: '13px' }}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            variant="borderless"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {filteredFirstNames.map(n => <Select.Option key={n} value={n}>{n}</Select.Option>)}
                        </Select>
                    </div>
                </div>
            ),
            dataIndex: 'firstName',
            key: 'firstName',
            width: 150,
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
            title: (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px' }}>
                    תאריך עליה
                    <Button
                        type="text"
                        size="small"
                        icon={dateSortOrder === 'asc' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        style={{
                            color: dateSortOrder ? '#1890ff' : 'gray',
                            backgroundColor: dateSortOrder ? '#e6f7ff' : 'transparent',
                            border: dateSortOrder ? '1px solid #1890ff' : 'none'
                        }}
                        onClick={() => {
                            if (dateSortOrder === null) setDateSortOrder('asc');
                            else if (dateSortOrder === 'asc') setDateSortOrder('desc');
                            else setDateSortOrder(null);
                        }}
                    />
                </div>
            ),
            dataIndex: 'aliyah_date',
            key: 'aliyah_date',
            width: 130,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } }),
            render: (text) => formatHebrewDateToTextual(text, true)
        },
        {
            title: 'זמן שעבר בימים',
            key: 'days_since_aliyah',
            width: 90,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold', color: '#cf1322', lineHeight: '1.25', padding: '4px 8px' } }),
            render: (_, record) => {
                const days = getDaysSinceAliyah(record.aliyah_date);
                return days !== null ? `${days} ימים` : '-';
            }
        },
        {
            title: 'פרשת עליה',
            dataIndex: 'aliyah_parasha',
            key: 'aliyah_parasha',
            width: 140,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } }),
            render: (text) => translateParashaName(text)
        },
        {
            title: 'סוג עליה',
            dataIndex: 'aliyah_type',
            key: 'aliyah_type',
            width: 100,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } }),
            render: (text) => translateText(text)
        },
        {
            title: 'פעולות',
            key: 'actions',
            width: 100,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } }),
            render: (_, record) => isAdmin ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(record)}
                        title="עריכה"
                    />
                    <Popconfirm
                        title="האם למחוק רשומה זו מהארכיון?"
                        onConfirm={() => onDelete(record.archiveId)}
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
            ) : null
        }
    ], [selectedLastName, selectedFirstName, uniqueLastNames, filteredFirstNames, dateSortOrder, onEdit, onDelete, isAdmin]);

    const filteredData = useMemo(() => {
        return archiveData.filter(item => {
            const matchesSearch = (item.lastName?.toLowerCase().includes(searchText.toLowerCase())) ||
                (item.firstName?.toLowerCase().includes(searchText.toLowerCase()));
            const matchesAliyahType = !selectedAliyahType || item.aliyah_type === selectedAliyahType;
            const matchesLastName = !selectedLastName || item.lastName === selectedLastName;
            const matchesFirstName = !selectedFirstName || item.firstName === selectedFirstName;
            return matchesSearch && matchesAliyahType && matchesLastName && matchesFirstName;
        });
    }, [archiveData, searchText, selectedAliyahType, selectedLastName, selectedFirstName]);

    const sortedFilteredData = useMemo(() => {
        const sorted = [...filteredData];
        if (dateSortOrder) {
            sorted.sort((a, b) => {
                const diff = (a._absDate || 0) - (b._absDate || 0);
                return dateSortOrder === 'asc' ? diff : -diff;
            });
        }
        return sorted;
    }, [filteredData, dateSortOrder]);

    // Calculate date range for the header
    const dateRange = useMemo(() => {
        if (!archiveData || archiveData.length === 0) return null;

        let minItem = null;
        let maxItem = null;
        let minAbs = Infinity;
        let maxAbs = -Infinity;

        archiveData.forEach(item => {
            const abs = item._absDate;
            if (!abs) return;

            if (abs < minAbs) {
                minAbs = abs;
                minItem = item;
            }
            if (abs > maxAbs) {
                maxAbs = abs;
                maxItem = item;
            }
        });

        if (!minItem || !maxItem) return null;
        return {
            start: formatHebrewDateToTextual(minItem.aliyah_date, true),
            end: formatHebrewDateToTextual(maxItem.aliyah_date, true)
        };
    }, [archiveData]);

    return (
        <Modal
            title={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HistoryOutlined style={{ color: '#00008B', fontSize: '24px' }} />
                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#00008B' }}>ארכיון שינויים {memberId ? '(היסטוריית מתפלל)' : ''}</span>
                    </div>
                    {dateRange && (
                        <div style={{ fontSize: '16px', color: '#1890ff', fontWeight: 'bold' }}>
                            מתאריך: {dateRange.start} עד תאריך: {dateRange.end}
                        </div>
                    )}
                </div>
            }
            open={visible}
            zIndex={1020} // Above Member List (1000), Below Edit Member (1050)
            onCancel={onCancel}
            footer={[
                <div key="footer" style={{ padding: '0 8px 4px 0' }}>
                    <Button onClick={onCancel}>
                        סגור
                    </Button>
                </div>
            ]}
            width="100%"
            style={{ top: 0, margin: 0, maxWidth: '100vw', padding: 0, height: '100vh' }}
            styles={{
                body: { padding: '4px 16px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
                content: { height: '100vh', display: 'flex', flexDirection: 'column' }
            }}
        >
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                    סה"כ רשומות בארכיון: {filteredData.length}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                        className="export-btn-3d"
                        icon={<DownloadOutlined />}
                        onClick={() => saveJsonFile(archiveData, 'archive.json')}
                        title="ייצוא ארכיון"
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
                        className="import-btn-3d"
                        icon={<UploadOutlined />}
                        onClick={async () => {
                            const result = await loadJsonFile('archive-import-handle');
                            if (!result) return;
                            const { json } = result;
                            if (confirm(`האם אתה בטוח שברצונך לייבא ${json.length} רשומות ארכיון? פעולה זו תחליף את הארכיון הקיים!`)) {
                                try {
                                    const response = await fetch('http://localhost:3000/api/archive/import', {
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
                        title="ייבוא ארכיון"
                    >
                        ייבוא
                    </Button>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>סוג עליה:</span>
                    <div style={{
                        padding: '1px',
                        background: '#ffffff',
                        border: '1px solid #808080',
                        borderBottomColor: '#dfdfdf',
                        borderRightColor: '#dfdfdf',
                        boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 1px rgba(255,255,255,1)',
                        borderRadius: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Select
                            placeholder="הכל"
                            value={selectedAliyahType || undefined}
                            onChange={(value) => setSelectedAliyahType(value || '')}
                            style={{ width: '200px' }}
                            allowClear
                            variant="borderless"
                        >
                            <Select.Option value="">הצג הכל</Select.Option>
                            {uniqueAliyahTypes.map(type => (
                                <Select.Option key={type} value={type}>
                                    {translateText(type)}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>
                    <Button
                        className="print-btn-3d"
                        type="primary"
                        icon={<PrinterOutlined />}
                        onClick={handlePrint}
                    >
                        הדפס
                    </Button>
                </div>
            </div>
            <Table
                dataSource={sortedFilteredData}
                columns={columns}
                rowKey="archiveId"
                loading={loading}
                pagination={false}
                size="small"
                scroll={{ y: 'calc(100vh - 155px)' }}
            />
        </Modal>
    );
};

export default ArchiveListModal;
