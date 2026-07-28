import React, { useState, useMemo } from 'react';
import { Modal, Table, Button, Popconfirm, Input, Tooltip, Select } from 'antd';
import { EditOutlined, DeleteOutlined, SearchOutlined, HistoryOutlined, PrinterOutlined, DownloadOutlined, UploadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { getDaysSinceAliyah, getYahrzeitIfInCurrentWeek, getYahrzeitIfWithin30Days, getUpcomingShabbatInfo, parseHebrewDate, getHebrewMonthNumber, getShmitaYearStatus, getAbsDate } from '../utils/hebrewDateUtils';
import { HDate } from '@hebcal/core';
import { saveJsonFile, loadJsonFile } from '../utils/fileUtils';

const MembersListModal = ({ visible, onCancel, members, onEdit, onDelete, onViewHistory, onAddNew }) => {
    const [searchText, setSearchText] = useState('');
    const [daysLimit, setDaysLimit] = useState(localStorage.getItem('printDaysLimit') || '');
    const [timeAlefLimit, setTimeAlefLimit] = useState(localStorage.getItem('printTimeAlefLimit') || '');
    const dayOptions = Array.from({ length: 20 }, (_, i) => (i + 1) * 7);


    // Filter and sort members by last name and first name
    const filteredMembers = useMemo(() => {
        return members
            .filter(member =>
                member.lastName?.toLowerCase().includes(searchText.toLowerCase())
            )
            .sort((a, b) => {
                const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '', 'he');
                if (lastNameCompare !== 0) return lastNameCompare;
                return (a.firstName || '').localeCompare(b.firstName || '', 'he');
            });
    }, [members, searchText]);

    const handlePrintAllMembers = () => {
        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert("לא ניתן לפתוח חלון הדפסה. ייתכן שחוסם פופ-אפים פעיל.");
                return;
            }

            // Sort members alphabetically by last name, then first name
            const sortedMembers = [...members].sort((a, b) => {
                const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '', 'he');
                if (lastNameCompare !== 0) return lastNameCompare;
                return (a.firstName || '').localeCompare(b.firstName || '', 'he');
            });

            const html = `
                <html dir="rtl" lang="he">
                <head>
                    <title>רשימת מתפללים</title>
                    <style>
                        @page { size: A4 portrait; margin: 10mm; }
                        body { font-family: 'Assistant', sans-serif; padding: 10px; margin: 0; font-size: 14px; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .title { font-size: 24px; font-weight: bold; margin: 0; }
                        .member-row { display: flex; margin: 5px 0; line-height: 1.4; border-bottom: 1px solid #eee; padding-bottom: 3px; }
                        .member-row-header { display: flex; margin: 5px 0; line-height: 1.4; border-bottom: 2px solid #333; padding-bottom: 3px; font-weight: bold; color: #0066cc; }
                        .member-row span, .member-row-header span { flex-shrink: 0; padding: 0 4px; box-sizing: border-box; }
                        .number { width: 5%; text-align: center; }
                        .letter { width: 6%; }
                        .status { width: 8%; }
                        .lastName { width: 15%; }
                        .firstName { width: 15%; }
                        .fatherName { width: 15%; }
                        .fatherDeathDate { width: 18%; }
                        .motherDeathDate { width: 18%; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">רשימת מתפללים מלאה</div>
                    </div>
                    <div class="member-row-header">
                        <span class="number">#</span>
                        <span class="letter">אות</span>
                        <span class="status">מעמד</span>
                        <span class="lastName">שם משפחה</span>
                        <span class="firstName">שם פרטי</span>
                        <span class="fatherName">שם האב</span>
                        <span class="fatherDeathDate">פטירת אב</span>
                        <span class="motherDeathDate">פטירת אם</span>
                    </div>
                    ${sortedMembers.map((m, index) => `
                        <div class="member-row">
                            <span class="number">${index + 1}</span>
                            <span class="letter">${Array.isArray(m.letter) ? m.letter.join(', ') : m.letter || ''}</span>
                            <span class="status">${m.status || ''}</span>
                            <span class="lastName">${m.lastName || '-'}</span>
                            <span class="firstName">${m.firstName || '-'}</span>
                            <span class="fatherName">${m.fatherName || '-'}</span>
                            <span class="fatherDeathDate">${m.father_death_date || '-'}</span>
                            <span class="motherDeathDate">${m.mother_death_date || '-'}</span>
                        </div>
                    `).join('')}
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
        } catch (error) {
            console.error("Print error:", error);
        }
    };

    const handlePrint = async () => {
        try {
            const info = getUpcomingShabbatInfo();
            const limit = parseInt(daysLimit) || 0;
            const timeAlefLimitAmount = parseInt(timeAlefLimit) || 0;

            // Fetch archive to find the absolutely latest aliyah_date for each member
            let archiveRecords = [];
            try {
                const archRes = await fetch('http://localhost:3000/api/archive');
                archiveRecords = await archRes.json();
            } catch (e) {
                console.error("Failed to fetch archive for print sync:", e);
            }

            // Create a map of memberId -> latest aliyah date (as abs value)
            const memberLatestArchive = new Map();
            archiveRecords.forEach(a => {
                const aAbs = getAbsDate(a.aliyah_date);
                const current = memberLatestArchive.get(a.memberId);
                if (!current || aAbs > current.abs) {
                    memberLatestArchive.set(a.memberId, {
                        date: a.aliyah_date,
                        parasha: a.aliyah_parasha,
                        abs: aAbs
                    });
                }
            });

            const mappedMembers = members
                .map(m => {
                    // Start with the date in the profile
                    let latest = m.aliyah_date;
                    let latestAbs = getAbsDate(m.aliyah_date);
                    let latestParasha = m.aliyah_parasha;

                    // Check archive for anything later
                    const archiveLatest = memberLatestArchive.get(m.id);
                    if (archiveLatest && archiveLatest.abs > latestAbs) {
                        latest = archiveLatest.date;
                        latestParasha = archiveLatest.parasha;
                    }

                    return { ...m, aliyah_date: latest, aliyah_parasha: latestParasha };
                });

            const limitAmount = parseInt(daysLimit) || 0;

            const alefMembers = mappedMembers.filter(m => {
                const hasAlef = (Array.isArray(m.letter) && (m.letter.includes("א'") || m.letter.includes("א"))) || 
                               (typeof m.letter === 'string' && (m.letter.includes("א'") || m.letter.includes("א")));
                
                const daysPassedResult = getDaysSinceAliyah(m.aliyah_date);
                const daysPassed = daysPassedResult === null ? Infinity : daysPassedResult;
                
                // Print those who ascended BEFORE the time (more recently than X days)
                return hasAlef && daysPassed <= timeAlefLimitAmount;
            }).sort((a, b) => {
                const daysA = getDaysSinceAliyah(a.aliyah_date) || 0;
                const daysB = getDaysSinceAliyah(b.aliyah_date) || 0;
                return daysA - daysB;
            });

            const printableMembers = mappedMembers
                .filter(m => {
                    // Treat missing Aliyah date as "Infinity" days passed so they are always included if they meet other criteria
                    const daysPassedResult = getDaysSinceAliyah(m.aliyah_date);
                    const daysPassed = daysPassedResult === null ? Infinity : daysPassedResult;

                    const isYahrzeit = getYahrzeitIfInCurrentWeek(m.father_death_date) || getYahrzeitIfInCurrentWeek(m.mother_death_date);

                    if (isYahrzeit) return true;

                    const hasAlef = (Array.isArray(m.letter) && (m.letter.includes("א'") || m.letter.includes("א"))) || 
                                    (typeof m.letter === 'string' && (m.letter.includes("א'") || m.letter.includes("א")));
                                    
                    return !hasAlef && (daysPassed > limitAmount);
                })
                .sort((a, b) => {
                    const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '', 'he');
                    if (lastNameCompare !== 0) return lastNameCompare;
                    return (a.firstName || '').localeCompare(b.firstName || '', 'he');
                });


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
                        body { font-family: 'Assistant', sans-serif; padding: 20px; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .day-container { page-break-after: always; }
                        .day-container:last-child { page-break-after: auto; }
                        .header { text-align: center; margin-bottom: 5px; border-bottom: 2px solid #333; padding-bottom: 25px; padding-top: 5px; position: relative; }
                        .date-left { position: absolute; top: 10px; left: 10px; font-size: 14px; font-weight: bold; }
                        .shmita-right { position: absolute; top: 10px; right: 10px; font-size: 14px; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                        th, td { border: none; padding: 2px 4px; text-align: right; line-height: 13pt; }
                        th { border-bottom: 1px solid #333; font-weight: bold; font-size: 12pt; color: #0066cc; }
                        td { font-size: 11pt; }
                        .highlight-row { color: #ff0000 !important; font-weight: bold !important; }
                        .title { font-size: 20px; font-weight: bold; margin: 0; color: #ff0000; }
                        .info { font-size: 16px; color: #555; }
                    </style>
                </head>
                <body>
                    ${info.daysToPrint.map((dayInfo, index) => `
                    <div class="day-container">
                        <div class="header">
                            <div class="date-left">${dayInfo.shabbatDateFormatted || dayInfo.shabbatDate}</div>
                            <div class="shmita-right">
                                ${info.shmitaStatus || ''}<br/>
                                ${info.nextBirkatHaChama ? `ברכת החמה הבאה: ${info.nextBirkatHaChama}` : ''}
                            </div>
                            <div class="title">רשימת מתפללים - ${dayInfo.parasha}</div>
                            ${dayInfo.pirkeiAvot ? `<div style="color: #0066cc; font-size: 18px; font-weight: bold; margin-bottom: 5px;">${dayInfo.pirkeiAvot.display}</div>` : ''}
                            ${dayInfo.isBiurMaaserot ? `<div style="color: #0000ff; font-size: 18px; font-weight: bold; margin-bottom: 5px;">ביעור מעשרות</div>` : ''}
                            ${dayInfo.haftarah ? `<div style="color: #000; font-size: 11pt; margin-bottom: 5px;">הפטרת השבוע: ${dayInfo.haftarah}</div>` : ''}
                            ${dayInfo.specialShabbatType ? `<div style="color: #0066cc; font-size: 20px; font-weight: bold; margin-bottom: 5px;">${dayInfo.specialShabbatType}</div>` : ''}
                            ${info.isMevarchim ? `<div style="color: #ff0000; font-size: 18px; font-weight: bold; margin-top: 2px;">שבת מברכים ${info.month}</div>` : ''}
                        </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 5ch;">תואר</th>
                                <th style="width: 5ch;">מעמד</th>
                                <th style="width: 12ch;">שם משפחה</th>
                                <th style="width: 13ch;">שם פרטי</th>
                                <th style="width: 15ch;">שם אב</th>
                                <th style="width: 20ch;">פרשת עליה</th>
                                <th style="width: 5ch;">זמן שעבר</th>
                                <th style="width: 13ch;">יואצ'ט אב</th>
                                <th style="width: 13ch;">יואצ'ט אם</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${printableMembers.map(m => {
                const yFather = getYahrzeitIfInCurrentWeek(m.father_death_date);
                const yMother = getYahrzeitIfInCurrentWeek(m.mother_death_date);
                const hasYahrzeit = !!(yFather || yMother);

                const cellStyle = hasYahrzeit ? 'style="color: #ff0000 !important; font-weight: bold !important;"' : '';
                const rowStyle = hasYahrzeit ? 'style="background-color: #fffafa;"' : '';

                const formatYahrzeitDate = (hdObj) => {
                    if (!hdObj || !hdObj.hdate) return '';
                    const rendered = hdObj.hdate.renderGematriya(true, true);
                    let formatted = rendered;

                    if (hdObj.isRegularAdar && HDate.isLeapYear(hdObj.hdate.getFullYear())) {
                        formatted = formatted.replace(/אדר ב׳$/, 'אדר');
                    }

                    const dayOfWeek = hdObj.hdate.getDay();
                    const daysArr = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
                    const dayStr = daysArr[dayOfWeek];

                    return `${formatted} <span style="font-size: 10pt;">(${dayStr})</span>`;
                };

                const fatherYahrzeitDisp = formatYahrzeitDate(yFather);
                const motherYahrzeitDisp = formatYahrzeitDate(yMother);

                let daysDisp = '';
                if (!hasYahrzeit) {
                    daysDisp = `${getDaysSinceAliyah(m.aliyah_date) || 0}`;
                }

                const parashaDisp = m.aliyah_parasha ? m.aliyah_parasha.replace('פרשת ', '').replace(/[^\u0590-\u05FF\s"\-'\u05F3\u05F4]/g, '').trim() : '-';

                const statusStr = String(m.status || '');
                const isEmptyStatus = !statusStr || statusStr.trim() === '';
                const showStatus = isEmptyStatus ? '' : statusStr;

                return `
                                    <tr ${rowStyle}>
                                        <td ${cellStyle}>${m.title || ''}</td>
                                        <td ${cellStyle}>${showStatus}</td>
                                        <td ${cellStyle}>${m.lastName || '-'}</td>
                                        <td ${cellStyle}>${m.firstName || '-'}</td>
                                        <td ${cellStyle}>${m.fatherName || '-'}</td>
                                        <td ${cellStyle}>${parashaDisp}</td>
                                        <td ${cellStyle}>${daysDisp}</td>
                                        <td ${cellStyle}>${fatherYahrzeitDisp}</td>
                                        <td ${cellStyle}>${motherYahrzeitDisp}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    ${(() => {
                    const upcomingMemorials = [];
                    const _today = new HDate();
                    const _upcomingShabbat = _today.onOrAfter(6);
                    members.forEach(m => {
                        const fatherYahrzeit = getYahrzeitIfWithin30Days(m.father_death_date);
                        const motherYahrzeit = getYahrzeitIfWithin30Days(m.mother_death_date);

                        const isFatherThisWeek = getYahrzeitIfInCurrentWeek(m.father_death_date);
                        const isMotherThisWeek = getYahrzeitIfInCurrentWeek(m.mother_death_date);

                        const _statusStr = String(m.status || '').trim();

                        if (fatherYahrzeit && !isFatherThisWeek) {
                            const daysUntil = fatherYahrzeit.hdate.abs() - _upcomingShabbat.abs();
                            upcomingMemorials.push({
                                name: `${m.firstName || ''} ${m.lastName || ''}`.trim(),
                                date: fatherYahrzeit.formatted,
                                absDate: fatherYahrzeit.hdate.abs(),
                                daysUntil: daysUntil,
                                type: 'אב',
                                status: _statusStr
                            });
                        }

                        if (motherYahrzeit && !isMotherThisWeek) {
                            const daysUntil = motherYahrzeit.hdate.abs() - _upcomingShabbat.abs();
                            upcomingMemorials.push({
                                name: `${m.firstName || ''} ${m.lastName || ''}`.trim(),
                                date: motherYahrzeit.formatted,
                                absDate: motherYahrzeit.hdate.abs(),
                                daysUntil: daysUntil,
                                type: 'אם',
                                status: _statusStr
                            });
                        }
                    });

                    if (upcomingMemorials.length === 0) return '';

                    // Sort by absolute date ascending
                    upcomingMemorials.sort((a, b) => a.absDate - b.absDate);

                    return `
                    <div style="margin-top: 30px; padding: 15px; border: 2px solid #0066cc; border-radius: 8px; background-color: #f0f8ff;">
                        <h3 style="color: #0066cc; margin: 0 0 10px 0; text-align: center; font-size: 18px;">ימי זיכרון קרובים</h3>
                        <table style="width: 100%; margin-top: 10px;">
                            <thead>
                                <tr>
                                    <th style="color: #0066cc;">מעמד</th>
                                    <th style="color: #0066cc;">שם</th>
                                    <th style="color: #0066cc;">תאריך</th>
                                    <th style="color: #0066cc;">סוג</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${upcomingMemorials.map(memorial => `
                                    <tr>
                                        <td style="color: #0066cc;">${memorial.status}</td>
                                        <td style="color: #0066cc;">${memorial.name}</td>
                                        <td style="color: #0066cc;">${memorial.date} <span style="font-size: 10pt;">(${memorial.daysUntil} ימים)</span></td>
                                        <td style="color: #0066cc;">${memorial.type}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                })()}
                ${(() => {
                    if (alefMembers.length === 0) return '';
                    
                    return `
                    <div style="margin-top: 30px; padding: 15px; border: 2px solid #0066cc; border-radius: 8px;">
                        <h3 style="color: #000; margin: 0 0 10px 0; text-align: center; font-size: 18px;">אורחים שעלו פחות מלפני ${timeAlefLimitAmount} ימים</h3>
                        <table style="width: 100%; margin-top: 10px;">
                            <thead>
                                <tr>
                                    <th style="width: 5ch; color: #000;">תואר</th>
                                    <th style="width: 5ch; color: #000;">מעמד</th>
                                    <th style="width: 12ch; color: #000;">שם משפחה</th>
                                    <th style="width: 13ch; color: #000;">שם פרטי</th>
                                    <th style="width: 15ch; color: #000;">שם אב</th>
                                    <th style="width: 26ch; color: #000;">פרשת עליה</th>
                                    <th style="width: 5ch; color: #000;">זמן שעבר</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${alefMembers.map(m => {
                                    const daysPassedResult = getDaysSinceAliyah(m.aliyah_date);
                                    const daysPassed = daysPassedResult === null ? '0' : daysPassedResult;
                                    const parashaDisp = m.aliyah_parasha ? m.aliyah_parasha.replace('פרשת ', '').replace(/[^\u0590-\u05FF\s"\-'\u05F3\u05F4]/g, '').trim() : '-';
                                    
                                    const statusStr = String(m.status || '');
                                    const isEmptyStatus = !statusStr || statusStr.trim() === '';
                                    const showStatus = isEmptyStatus ? '' : statusStr;

                                    return `
                                    <tr>
                                        <td style="color: #000;">${m.title || ''}</td>
                                        <td style="color: #000;">${showStatus}</td>
                                        <td style="color: #000;">${m.lastName || '-'}</td>
                                        <td style="color: #000;">${m.firstName || '-'}</td>
                                        <td style="color: #000;">${m.fatherName || '-'}</td>
                                        <td style="color: #000;">${parashaDisp}</td>
                                        <td style="color: #000;">${daysPassed}</td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                        `;
                        })()}
                    </div>
                    `).join('')}
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
        } catch (error) {
            console.error("Print error:", error);
        }
    };

    const columns = useMemo(() => [
        {
            title: 'אורח',
            dataIndex: 'letter',
            key: 'letter',
            width: 60,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } }),
            render: (tags) => (Array.isArray(tags) ? tags.join(', ') : tags)
        },
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
            width: 120,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'שם פרטי',
            dataIndex: 'firstName',
            key: 'firstName',
            width: 120,
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
            title: 'תאריך פטירת אב',
            dataIndex: 'father_death_date',
            key: 'father_death_date',
            width: 150,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'תאריך פטירת אם',
            dataIndex: 'mother_death_date',
            key: 'mother_death_date',
            width: 150,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'פרשת בר מצווה',
            dataIndex: 'barMitzvahParasha',
            key: 'barMitzvahParasha',
            width: 120,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'תאריך עליה',
            dataIndex: 'aliyah_date',
            key: 'aliyah_date',
            width: 120,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'פרשת עליה',
            dataIndex: 'aliyah_parasha',
            key: 'aliyah_parasha',
            width: 120,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } }),
            render: (text) => text ? text.replace('פרשת ', '').replace(/[^\u0590-\u05FF\s"\-'\u05F3\u05F4]/g, '').trim() : '-'
        },
        {
            title: 'סוג עליה',
            dataIndex: 'aliyah_type',
            key: 'aliyah_type',
            width: 100,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            onCell: () => ({ style: { fontSize: '18px', lineHeight: '1.25', padding: '4px 8px' } })
        },
        {
            title: 'פעולות',
            key: 'actions',
            width: 110,
            onHeaderCell: () => ({ style: { fontSize: '18px', fontWeight: 'bold' } }),
            render: (_, record) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <Button
                        type="link"
                        icon={<HistoryOutlined />}
                        onClick={() => onViewHistory(record.id)}
                        title="היסטוריית שינויים"
                        style={{ color: '#1890ff' }}
                    />
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(record)}
                        title="עריכה"
                        style={{ padding: '4px' }}
                    />
                    <Popconfirm
                        title="האם למחוק מתפלל זה?"
                        onConfirm={() => onDelete(record.id)}
                        okText="כן"
                        cancelText="לא"
                    >
                        <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            title="מחיקה"
                            style={{ padding: '4px' }}
                        />
                    </Popconfirm>
                </div>
            ),
        }
    ], [onViewHistory, onEdit, onDelete]);

    return (
        <Modal
            title={
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
                    {/* Centered title */}
                    <span style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#00008B',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none'
                    }}>רשימת מתפללים</span>
                    {/* Buttons on the left (opposite side in RTL) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                        <Button
                            onClick={onAddNew}
                            style={{
                                background: '#e6f7ff',
                                color: '#003a8c',
                                borderColor: '#91d5ff',
                                fontWeight: 'bold'
                            }}
                        >
                            הוספת מתפלל
                        </Button>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: '#f5f5f5',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            border: '1px solid #d9d9d9'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#444' }}>ימים:</span>
                                <Select
                                    variant="borderless"
                                    style={{ width: '60px', fontWeight: 'bold', fontSize: '15px' }}
                                    value={daysLimit || 7}
                                    onChange={(val) => {
                                        setDaysLimit(val);
                                        localStorage.setItem('printDaysLimit', val);
                                    }}
                                    options={dayOptions.map(d => ({ label: d, value: d }))}
                                />
                                <Tooltip
                                    title={<div style={{ color: '#006400' }}>מספר הימים הרצוי להדפסה מאז עליה אחרונה</div>}
                                    placement="bottom"
                                    zIndex={1200}
                                    overlayInnerStyle={{
                                        backgroundColor: '#ffffcc',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '8px',
                                        padding: '8px'
                                    }}
                                >
                                    <QuestionCircleOutlined style={{ color: '#1890ff', cursor: 'help', fontSize: '13px' }} />
                                </Tooltip>
                            </div>

                            <div style={{ width: '1px', height: '30px', background: '#d9d9d9' }}></div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#444' }}>זמן א':</span>
                                <Select
                                    variant="borderless"
                                    style={{ width: '60px', fontWeight: 'bold', fontSize: '15px' }}
                                    value={timeAlefLimit || 7}
                                    onChange={(val) => {
                                        setTimeAlefLimit(val);
                                        localStorage.setItem('printTimeAlefLimit', val);
                                    }}
                                    options={dayOptions.map(d => ({ label: d, value: d }))}
                                />
                                <Tooltip
                                    title={<div style={{ color: '#006400' }}>אורחים שעלו לפני מספר זה</div>}
                                    placement="bottom"
                                    zIndex={1200}
                                    overlayInnerStyle={{
                                        backgroundColor: '#ffffcc',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '8px',
                                        padding: '8px'
                                    }}
                                >
                                    <QuestionCircleOutlined style={{ color: '#1890ff', cursor: 'help', fontSize: '13px' }} />
                                </Tooltip>
                            </div>
                        </div>
                        <Button
                            icon={<PrinterOutlined />}
                            onClick={handlePrint}
                            style={{ background: '#52c41a', borderColor: '#52c41a', color: 'black', fontWeight: 'bold' }}
                        >
                            הדפס
                        </Button>

                        <Button
                            icon={<PrinterOutlined />}
                            onClick={handlePrintAllMembers}
                            style={{ background: '#1890ff', borderColor: '#1890ff', color: 'white', fontWeight: 'bold' }}
                        >
                            הדפס מתפללים
                        </Button>

                        <Button
                            icon={<DownloadOutlined />}
                            onClick={() => saveJsonFile(members, 'members.json')}
                            title="ייצוא לקובץ"
                            style={{
                                background: '#ffe7ba',
                                borderColor: '#ffbb96',
                                color: 'black',
                                fontWeight: 'bold'
                            }}
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
                                const result = await loadJsonFile('members-import-handle');
                                if (!result) return;
                                const { json } = result;
                                if (confirm(`האם אתה בטוח שברצונך לייבא ${json.length} מתפללים? פעולה זו תחליף את הרשימה הקיימת!`)) {
                                    try {
                                        const response = await fetch('http://localhost:3000/api/members/import', {
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
                            style={{
                                background: '#efdbff',
                                borderColor: '#b37feb',
                                color: '#391085',
                                fontWeight: 'bold'
                            }}
                        >
                            ייבוא
                        </Button>
                    </div>
                </div>
            }
            open={visible}
            onCancel={onCancel}
            footer={[
                <Button key="close" onClick={onCancel}>
                    סגור
                </Button>
            ]}
            width="100%"
            style={{ top: 0, margin: 0, maxWidth: '100vw', padding: 0, height: '100vh' }}
            className="members-list-modal full-screen-modal"
            styles={{
                header: { borderBottom: '1px solid #f0f0f0' },
                body: { padding: '10px', height: 'calc(100vh - 110px)', overflowY: 'auto', overflowX: 'hidden' },
                mask: { backgroundColor: 'rgba(0, 0, 0, 0.45)' },
                content: { height: '100vh', display: 'flex', flexDirection: 'column' }
            }}
        >
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Input
                    placeholder="חיפוש לפי שם משפחה..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: '300px' }}
                    allowClear
                />
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    סה"כ מתפללים: {filteredMembers.length} {searchText && `(מתוך ${members.length})`}
                </span>
            </div>
            <Table
                dataSource={filteredMembers}
                columns={columns}
                rowKey="id"
                tableLayout="fixed"
                pagination={false}
                scroll={{ y: 'calc(100vh - 250px)' }}
            />
        </Modal>
    );
};

export default MembersListModal;
